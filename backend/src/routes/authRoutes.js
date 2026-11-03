import crypto from 'node:crypto';
import express from 'express';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { recordAudit } from '../services/auditService.js';
import { hashPassword, hashToken, issueTokens, setAuthCookies, clearAuthCookies, verifyPassword, verifyRefreshToken } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { PasswordOtp } from '../models/PasswordOtp.js';
import { sendPasswordOtp } from '../services/emailService.js';

const router = express.Router();
const publicUser = (user) => ({
    id: user._id.toString(),
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    role: user.role,
    organizationId: user.organizationId?.toString() || null,
    permissions: user.permissions || []
});

router.post('/register', async (req, res, next) => {
    try {
        const { email, password, firstname, lastname, username, phone } = req.body;
        if (!email || !password || password.length < 8 || !firstname) {
            return res.status(400).json({ success: false, message: 'Email, first name, and a password of at least 8 characters are required.' });
        }
        const exists = await User.exists({ email: email.toLowerCase() });
        if (exists) return res.status(409).json({ success: false, message: 'Email is already registered.' });
        const user = await User.create({ email: email.toLowerCase(), passwordHash: await hashPassword(password), firstname, lastname, username, phone, role: 'OPERATOR', status: 'active' });
        await recordAudit({ actorUserId: user.id, action: 'USER_REGISTERED', resourceType: 'User', resourceId: user.id, ipAddress: req.ip });
        res.status(201).json({ success: true, user: publicUser(user) });
    } catch (error) {
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const email = req.body.email?.toLowerCase();
        const user = await User.findOne({ email }).select('+passwordHash +password +refreshTokenHash');
        if (!user || user.status !== 'active') return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        const valid = user.passwordHash
            ? await verifyPassword(req.body.password || '', user.passwordHash)
            : user.password === req.body.password;
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        if (!user.passwordHash && user.password) {
            user.passwordHash = await hashPassword(req.body.password);
            user.password = undefined;
        }
        const tokens = issueTokens(user);
        user.refreshTokenHash = hashToken(tokens.refreshToken);
        user.lastLoginAt = new Date();
        user.lastActivityAt = new Date();
        await user.save();
        setAuthCookies(res, tokens);
        await recordAudit({ actorUserId: user.id, action: 'LOGIN', resourceType: 'User', resourceId: user.id, organizationId: user.organizationId, ipAddress: req.ip });
        res.json({ success: true, user: publicUser(user) });
    } catch (error) {
        next(error);
    }
});

router.post('/refresh', async (req, res, next) => {
    try {
        const token = req.cookies?.hydroos_refresh;
        if (!token) return res.status(401).json({ success: false, message: 'Refresh authentication required.' });
        const claims = verifyRefreshToken(token);
        const user = await User.findById(claims.sub).select('+refreshTokenHash');
        if (!user?.refreshTokenHash || user.refreshTokenHash !== hashToken(token) || user.status !== 'active') {
            return res.status(401).json({ success: false, message: 'Refresh token revoked.' });
        }
        const tokens = issueTokens(user);
        user.refreshTokenHash = hashToken(tokens.refreshToken);
        await user.save();
        setAuthCookies(res, tokens);
        res.json({ success: true, user: publicUser(user) });
    } catch (error) {
        next(Object.assign(error, { statusCode: 401 }));
    }
});

router.post('/logout', async (req, res, next) => {
    try {
        const token = req.cookies?.hydroos_refresh;
        if (token) {
            try {
                const claims = verifyRefreshToken(token);
                await User.findByIdAndUpdate(claims.sub, { $unset: { refreshTokenHash: 1 } });
                await recordAudit({ actorUserId: claims.sub, action: 'LOGOUT', resourceType: 'User', resourceId: claims.sub, ipAddress: req.ip });
            } catch {
                // Invalid refresh cookies are still cleared below.
            }
        }
        clearAuthCookies(res);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

router.get('/me', authenticate, (req, res) => res.json({ success: true, user: publicUser(req.user) }));

router.post('/password-change/request', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('email role status');
        if (!user || user.role !== 'SUPER_ADMIN' || user.status !== 'active') return res.status(403).json({ success: false, message: 'Only an active Super Admin can change this password.' });
        const code = String(crypto.randomInt(100000, 1000000));
        await PasswordOtp.deleteMany({ userId: user._id, purpose: 'PASSWORD_CHANGE', consumedAt: { $exists: false } });
        const otp = await PasswordOtp.create({ userId: user._id, email: user.email, codeHash: hashToken(code), purpose: 'PASSWORD_CHANGE', expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
        try {
            await sendPasswordOtp({ to: user.email, code });
        } catch (error) {
            await PasswordOtp.deleteOne({ _id: otp._id });
            throw error;
        }
        res.json({ success: true, message: `A password-change code was sent to ${user.email}.` });
    } catch (error) { next(error); }
});

router.post('/password-change/confirm', authenticate, async (req, res, next) => {
    try {
        if (!req.body.code || !/^\d{6}$/.test(String(req.body.code)) || !req.body.password || req.body.password.length < 8) return res.status(400).json({ success: false, message: 'A six-digit OTP and a password of at least 8 characters are required.' });
        const otp = await PasswordOtp.findOne({ userId: req.user.id, purpose: 'PASSWORD_CHANGE', consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
        if (!otp || otp.attempts >= 5 || hashToken(String(req.body.code)) !== otp.codeHash) {
            if (otp) await PasswordOtp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
            return res.status(400).json({ success: false, message: 'Invalid or expired password-change code.' });
        }
        const user = await User.findOne({ _id: req.user.id, role: 'SUPER_ADMIN', status: 'active' });
        if (!user) return res.status(403).json({ success: false, message: 'Super Admin account is unavailable.' });
        user.passwordHash = await hashPassword(req.body.password);
        user.refreshTokenHash = undefined;
        await user.save();
        await PasswordOtp.updateOne({ _id: otp._id }, { $set: { consumedAt: new Date() } });
        clearAuthCookies(res);
        res.json({ success: true, message: 'Password changed. Please sign in again.' });
    } catch (error) { next(error); }
});

router.post('/forgot-password', async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email?.toLowerCase() });
        if (user) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            user.passwordResetTokenHash = hashToken(rawToken);
            user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await user.save();
        }
        res.json({ success: true, message: 'If the account exists, password reset instructions will be sent.' });
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password', async (req, res, next) => {
    try {
        if (!req.body.password || req.body.password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        const user = await User.findOne({ email: req.body.email?.toLowerCase() }).select('+passwordResetTokenHash');
        if (!user || !req.body.token || user.passwordResetTokenHash !== hashToken(req.body.token) || user.passwordResetExpiresAt < new Date()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset request.' });
        }
        user.passwordHash = await hashPassword(req.body.password || '');
        user.passwordResetTokenHash = undefined;
        user.passwordResetExpiresAt = undefined;
        user.refreshTokenHash = undefined;
        await user.save();
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export { router as authRoutes };
