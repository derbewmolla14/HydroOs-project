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

    app.post('/api/register', (req, res) => res.status(410).json({ success: false, message: 'This authentication endpoint has been retired. Use /api/v1/auth/register.' }));

    app.post('/api/login', (req, res) => res.status(410).json({ success: false, message: 'This authentication endpoint has been retired. Use /api/v1/auth/login.' }));

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

    app.post('/admin/login', (req, res) => res.status(410).json({ success: false, message: 'This authentication endpoint has been retired. Use /api/v1/auth/login.' }));

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
