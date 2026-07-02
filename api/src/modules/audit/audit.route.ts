import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { requirePermission } from "../../middleware/requirePermission.js";

const listAuditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(500),
  userId: z.string().optional(),
  entityType: z.string().optional(),
});

export async function auditRoutes(app: FastifyInstance) {
  // GET /audit-logs
  app.get("/", { preHandler: [app.authenticate, requirePermission("view_audit_log")] }, async (req) => {
    const { limit, userId, entityType } = listAuditQuerySchema.parse(req.query);

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(entityType ? { entityType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return logs.map((log) => ({
      id:           log.id,
      user_id:      log.userId,
      user_name:    log.userName,
      action:       log.action,
      entity_type:  log.entityType,
      request_id:   log.entityId,
      status_before: (log.details as any)?.from ?? null,
      status_after:  (log.details as any)?.to ?? null,
      created_at:   log.createdAt.toISOString(),
    }));
  });

  // GET /audit-logs/count
  app.get("/count", { preHandler: [app.authenticate, requirePermission("view_audit_log")] }, async () => {
    const count = await prisma.auditLog.count();
    return { count };
  });
}
