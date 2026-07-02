import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";
import { requirePermission } from "../../middleware/requirePermission.js";

const querySchema = z.object({
  requestId: z.string().optional(),
  limit:     z.coerce.number().int().min(1).max(500).optional().default(200),
});

export async function securityRoutes(app: FastifyInstance) {
  // GET /security-logs
  app.get("/", { preHandler: [app.authenticate, requirePermission("view_audit_log")] }, async (req) => {
    const { requestId, limit } = querySchema.parse(req.query);

    const rows = await prisma.securityLog.findMany({
      where: requestId ? { requestId } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((r) => ({
      id:           r.id,
      requestId:    r.requestId,
      employeeId:   r.employeeId,
      employeeName: r.employeeName,
      type:         r.type,
      officerId:    r.officerId,
      officerName:  r.officerName,
      notes:        r.notes,
      createdAt:    r.createdAt.toISOString(),
    }));
  });
}
