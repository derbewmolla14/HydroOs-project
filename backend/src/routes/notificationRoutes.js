import express from 'express';
import { Notification } from '../models/Notification.js';
import { NotificationPreference } from '../models/NotificationPreference.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '20', 10), 1), 100);
        const filter = { userId: req.user.id };
        const [items, unread] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('alertId').lean(),
            Notification.countDocuments({ userId: req.user.id, readAt: null })
        ]);
        const total = await Notification.countDocuments(filter);
        res.json({ success: true, items, unread, page, limit, total, pages: Math.ceil(total / limit) });
    } catch (error) { next(error); }
});

router.patch('/read-all', async (req, res, next) => {
    try { await Notification.updateMany({ userId: req.user.id, readAt: null }, { $set: { readAt: new Date() } }); res.json({ success: true }); } catch (error) { next(error); }
});

router.patch('/:notificationId/read', async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate({ _id: req.params.notificationId, userId: req.user.id }, { $set: { readAt: new Date() } }, { new: true }).lean();
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
        res.json({ success: true, notification });
    } catch (error) { next(error); }
});

router.get('/preferences', async (req, res, next) => {
    try { res.json({ success: true, preferences: await NotificationPreference.findOne({ userId: req.user.id }).lean() || await NotificationPreference.create({ userId: req.user.id }) }); } catch (error) { next(error); }
});

router.patch('/preferences', async (req, res, next) => {
    try {
        const allowed = ['critical', 'warning', 'info', 'deviceDisconnections', 'waterLevel', 'waterQuality'];
        const values = Object.fromEntries(allowed.filter((key) => typeof req.body[key] === 'boolean').map((key) => [key, req.body[key]]));
        const preferences = await NotificationPreference.findOneAndUpdate({ userId: req.user.id }, { $set: values }, { upsert: true, new: true, runValidators: true }).lean();
        res.json({ success: true, preferences });
    } catch (error) { next(error); }
});

export { router as notificationRoutes };
