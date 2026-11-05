import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { recordAudit } from '../services/auditService.js';
import { collectTankHistory, createTankHistoryDocument, createTankHistoryWorkbook } from '../services/exportService.js';

const router = express.Router();
router.use(authenticate);

router.get('/tank-history', async (req, res, next) => {
    try {
        const report = await collectTankHistory({ user: req.user, tankId: req.query.tankId, from: req.query.from, to: req.query.to, readingStatus: req.query.readingStatus });
        await recordAudit({ actorUserId: req.user.id, action: 'TANK_HISTORY_VIEWED', resourceType: 'Tank', resourceId: report.tank.id, organizationId: report.tank.organizationId, metadata: { filters: req.query }, ipAddress: req.ip });
        const format = req.query.format || 'json';
        if (format === 'json') return res.json({ success: true, tank: report.tank, filters: report.filters, generatedAt: report.generatedAt, readings: report.rows });
        let contentType;
        let filename;
        let buffer;
        if (format === 'xlsx') {
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            filename = `${report.tank.code}-history.xlsx`;
            buffer = createTankHistoryWorkbook(report);
        } else if (format === 'docx') {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            filename = `${report.tank.code}-history.docx`;
            buffer = await createTankHistoryDocument(report);
        } else return res.status(400).json({ success: false, message: 'Export format must be json, xlsx, or docx.' });
        await recordAudit({ actorUserId: req.user.id, action: 'TANK_HISTORY_EXPORTED', resourceType: 'Tank', resourceId: report.tank.id, organizationId: report.tank.organizationId, metadata: { format, filters: req.query, rowCount: report.rows.length }, ipAddress: req.ip });
        res.set({ 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${filename}"` });
        return res.send(buffer);
    } catch (error) { return next(error); }
});

export { router as exportRoutes };
