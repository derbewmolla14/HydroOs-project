import { AuditLog } from '../models/AuditLog.js';

export function recordAudit({ actorUserId, action, resourceType, resourceId, organizationId, metadata, ipAddress }) {
    return AuditLog.create({ actorUserId, action, resourceType, resourceId, organizationId, metadata, ipAddress });
}
