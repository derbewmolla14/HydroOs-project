import express from 'express';
import { Alert } from '../models/Alert.js';
import { AlertConfig } from '../models/AlertConfig.js';
import { authenticate, hasTenantAccess, requireRoles } from '../middleware/auth.js';
import { canManageAlertLifecycle, canManageAlerts, configFor, listAlerts, validateAlertConfig } from '../services/alertService.js';
import { recordAudit } from '../services/auditService.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
    try { res.json({ success: true, ...await listAlerts({ user: req.user, query: req.query }) }); } catch (error) { next(error); }
});

router.get('/config', async (req, res, next) => {
    try {
        const organizationId = req.user.role === 'SUPER_ADMIN' ? req.query.organizationId : req.user.organizationId;
        if (!organizationId) return res.status(400).json({ success: false, message: 'Organization is required.' });
        res.json({ success: true, config: await configFor(organizationId, req.query.tankId || null) });
    } catch (error) { next(error); }
});

router.patch('/config', requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN'), async (req, res, next) => {
    try {
        const organizationId = req.user.role === 'SUPER_ADMIN' ? req.body.organizationId : req.user.organizationId;
        if (!organizationId) return res.status(400).json({ success: false, message: 'Organization is required.' });
        const allowed = ['waterLevel', 'quality', 'device', 'usage'];
        if (!canManageAlerts(req.user)) return res.status(403).json({ success: false, message: 'Alert configuration permission is required.' });
        const values = validateAlertConfig(Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]])));
        const config = await AlertConfig.findOneAndUpdate({ organizationId, tankId: req.body.tankId || null }, { $set: values }, { upsert: true, new: true, runValidators: true });
        await recordAudit({ actorUserId: req.user.id, action: 'ALERT_CONFIG_UPDATED', resourceType: 'AlertConfig', resourceId: config.id, organizationId, metadata: { tankId: config.tankId } });
        res.json({ success: true, config });
    } catch (error) { next(error); }
});

router.get('/:alertId', async (req, res, next) => {
    try {
        const alert = await Alert.findById(req.params.alertId).populate('tankId', 'name code').populate('deviceId', 'name identifier').lean();
        if (!alert || !hasTenantAccess(req.user, alert.organizationId.toString())) return res.status(404).json({ success: false, message: 'Alert not found.' });
        res.json({ success: true, alert });
    } catch (error) { next(error); }
});

async function updateStatus(req, res, next, status) {
    try {
        if (!canManageAlertLifecycle(req.user)) return res.status(403).json({ success: false, message: 'Alert lifecycle permission is required.' });
        const alert = await Alert.findById(req.params.alertId);
        if (!alert || !hasTenantAccess(req.user, alert.organizationId.toString())) return res.status(404).json({ success: false, message: 'Alert not found.' });
        const now = new Date();
        const update = { status, $push: { history: { action: status, actorUserId: req.user.id, note: req.body.note || '', at: now } } };
        if (status === 'ACKNOWLEDGED') Object.assign(update, { acknowledgedBy: req.user.id, acknowledgedAt: now });
        if (status === 'RESOLVED') Object.assign(update, { resolvedBy: req.user.id, resolvedAt: now });
        if (status === 'SNOOZED') update.snoozedUntil = new Date(now.getTime() + Math.min(Math.max(Number(req.body.minutes) || 60, 5), 7 * 24 * 60) * 60000);
        const updated = await Alert.findByIdAndUpdate(alert.id, update, { new: true }).lean();
        await recordAudit({ actorUserId: req.user.id, action: `ALERT_${status}`, resourceType: 'Alert', resourceId: alert.id, organizationId: alert.organizationId, metadata: { note: req.body.note || '' } });
        req.app.get('io')?.to?.(`organization:${alert.organizationId}`).emit('alert:updated', { organizationId: alert.organizationId, alert: updated });
        res.json({ success: true, alert: updated });
    } catch (error) { next(error); }
}

router.patch('/:alertId/acknowledge', (req, res, next) => updateStatus(req, res, next, 'ACKNOWLEDGED'));
router.patch('/:alertId/resolve', (req, res, next) => updateStatus(req, res, next, 'RESOLVED'));
router.patch('/:alertId/snooze', (req, res, next) => updateStatus(req, res, next, 'SNOOZED'));

export { router as alertRoutes };
