import { prisma } from './prisma';

type AuditParams = {
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
};

export const logAudit = async (params: AuditParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        details: params.details ?? null,
        userId: params.userId ?? null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch {
    // Audit logging must never break the main flow
  }
};
