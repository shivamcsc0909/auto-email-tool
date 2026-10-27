import { prisma } from '../../prisma.js';

export interface LogAuditParams {
  userId?: string | null;
  module: string;
  action: string;
  status?: string;
  referenceId?: string | null;
  details?: Record<string, any> | string;
  ipAddress?: string | null;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const detailsString =
      typeof params.details === 'object'
        ? JSON.stringify(params.details)
        : params.details || null;

    let validUserId: string | null = null;
    if (params.userId) {
      const userExists = await prisma.adminUser.findUnique({
        where: { id: params.userId },
        select: { id: true },
      });
      if (userExists) {
        validUserId = userExists.id;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        module: params.module,
        action: params.action,
        status: params.status || 'SUCCESS',
        referenceId: params.referenceId || null,
        details: detailsString,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
