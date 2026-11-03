import express from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';
import { Organization } from '../models/Organization.js';
import { Tank } from '../models/Tank.js';
import { User } from '../models/User.js';

const router = express.Router();
router.use(authenticate, requireRoles('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN', 'OPERATOR'));

router.get('/overview', async (req, res, next) => {
    try {
        const organizationFilter = req.user.role === 'SUPER_ADMIN' ? {} : { organizationId: req.user.organizationId };
        const tankFilter = req.user.role === 'OPERATOR' ? { ...organizationFilter, $or: [{ assignedOperatorId: req.user.id }, { assignedUserIds: req.user.id }] } : organizationFilter;
        const [organizations, users, tanks, activities] = await Promise.all([
            req.user.role === 'SUPER_ADMIN'
                ? Organization.find({}, 'name code status subscription').sort({ name: 1 }).lean()
                : Organization.find({ _id: req.user.organizationId }, 'name code status subscription').lean(),
            User.countDocuments(organizationFilter),
            Tank.find(tankFilter, 'name code capacity status organizationId createdAt').sort({ createdAt: -1 }).lean(),
            AuditLog.find({ ...organizationFilter }).sort({ createdAt: -1 }).limit(8).lean()
        ]);
        const activeTanks = tanks.filter((tank) => tank.status === 'active').length;
        res.json({
            success: true,
            scope: req.user.role === 'SUPER_ADMIN' ? 'platform' : 'organization',
            summary: {
                organizations: organizations.length,
                users,
                tanks: tanks.length,
                activeTanks,
                averageWaterLevel: null,
                waterUsage: null,
                activeDevices: null,
                activeAlerts: null
            },
            organizations,
            tanks,
            activities,
            capabilities: {
                readings: false,
                devices: false,
                irrigationControls: false,
                map: false
            }
        });
    } catch (error) {
        next(error);
    }
});

export { router as dashboardRoutes };
