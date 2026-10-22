import AuditLog from '../models/AuditLog.js';

export const logAudit = (req, action, targetType, targetId, details = {}) =>
  AuditLog.create({
    actor: req.user._id,
    action,
    targetType,
    targetId,
    details,
    ip: req.ip,
  });