import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import XLSX from 'xlsx';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Receipt } from '../models/Receipt.js';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword } from '../services/authService.js';

function createUploadMiddleware() {
    const { cloudName, apiKey, apiSecret } = env.cloudinary;
    if (!cloudName || !apiKey || !apiSecret) {
        return null;
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    const storage = new CloudinaryStorage({
        cloudinary,
        params: { folder: 'hydroos-reciepts', allowed_formats: ['jpg', 'png', 'jpeg'] }
    });
    return multer({ storage });
}

export function registerLegacyRoutes(app, io, projectRoot) {
    const upload = createUploadMiddleware();

    app.post('/api/register', async (req, res, next) => {
        try {
            const user = await User.create({ ...req.body, passwordHash: await hashPassword(req.body.password || ''), password: undefined });
            res.status(201).json({ success: true, message: 'Registered!', user: { id: user.id, email: user.email } });
        } catch (error) {
            next(Object.assign(error, { statusCode: 400 }));
        }
    });

    app.post('/api/login', async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email: email?.toLowerCase() }).select('+passwordHash +password');
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid login!' });
            }
            const valid = user.passwordHash ? await verifyPassword(password || '', user.passwordHash) : user.password === password;
            if (!valid) return res.status(401).json({ success: false, message: 'Invalid login!' });
            if (!user.passwordHash) {
                user.passwordHash = await hashPassword(password);
                user.password = undefined;
                await user.save();
            }
            const userResponse = user.toObject();
            delete userResponse.password;
            res.json({ success: true, user: userResponse });
        } catch (error) {
            next(error);
        }
    });

    app.post('/api/reset-password', async (req, res, next) => {
        try {
            const { email, phone, newPassword } = req.body;
            const user = await User.findOneAndUpdate(
                { email: email?.toLowerCase(), phone },
                { passwordHash: await hashPassword(newPassword), $unset: { password: 1 } },
                { new: true }
            );
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    });

    app.post('/submit-payment', (req, res, next) => {
        if (!upload) {
            return res.status(503).json({ success: false, message: 'Receipt uploads are not configured.' });
        }
        upload.single('receipt')(req, res, async (uploadError) => {
            if (uploadError) return next(uploadError);
            try {
                if (!req.file) return res.status(400).json({ success: false, message: 'No image!' });
                const { username, email, serviceName } = req.body;
                const receipt = await Receipt.create({ url: req.file.path, username, email, serviceName });
                logger.info('Receipt saved', { receiptId: receipt.id, username });
                res.json({ success: true, message: 'Uploaded!', url: req.file.path });
            } catch (error) {
                next(error);
            }
        });
    });

    app.post('/admin/login', (req, res) => {
        if (!env.adminPassword) {
            return res.status(503).json({ success: false, message: 'Admin login is not configured.' });
        }
        if (req.body.password === env.adminPassword) {
            return res.json({ success: true });
        }
        res.status(401).json({ success: false });
    });

    app.post('/admin/approve-payment', async (req, res, next) => {
        try {
            const { id, username, email, serviceName } = req.body;
            const receipt = await Receipt.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
            if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
            io.emit('paymentApproved', { username, email, serviceName });
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    });

    app.post('/admin/reject-payment', async (req, res, next) => {
        try {
            const { serviceName, username, email, reason } = req.body;
            await Receipt.findOneAndDelete({ username, serviceName });
            io.emit('paymentRejected', { serviceName, username, email, reason });
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    });

    app.get('/admin/receipts', async (req, res, next) => {
        try {
            res.json(await Receipt.find().sort({ timestamp: -1 }));
        } catch (error) {
            next(error);
        }
    });

    app.get('/admin/download-users', async (req, res, next) => {
        const filePath = path.join(projectRoot, 'users.xlsx');
        try {
            const users = await User.find({}, '-password').lean();
            const worksheet = XLSX.utils.json_to_sheet(users);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
            XLSX.writeFile(workbook, filePath);
            res.download(filePath, 'users.xlsx', (error) => {
                if (error) logger.error('User export failed', { error: error.message });
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        } catch (error) {
            next(error);
        }
    });
}
