import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";

const querySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(200).optional().default(50),
});

const markReadSchema = z.object({
  ids: z.array(z.string()).optional(),
});

export async function notificationRoutes(app: FastifyInstance) {
  // GET /notifications
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    const { limit } = querySchema.parse(req.query);
    const targetUserId = req.user.sub;

    const rows = await prisma.notification.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return rows.map((n) => ({
      id:        n.id,
      userId:    n.userId,
      title:     n.title,
      message:   n.message,
      requestId: n.requestId,
      unread:    n.unread,
      icon:      n.icon,
      color:     n.color,
      bg:        n.bg,
      createdAt: n.createdAt.toISOString(),
    }));
  });

  // PATCH /notifications/mark-read  { ids?: string[] } — إذا مفيش ids يمارك الكل
  app.patch("/mark-read", { preHandler: [app.authenticate] }, async (req) => {
    const { ids } = markReadSchema.parse(req.body);
    const userId = req.user.sub;

    await prisma.notification.updateMany({
      where: {
        userId,
        ...(ids?.length ? { id: { in: ids } } : {}),
      },
      data: { unread: false },
    });

    return { ok: true };
  });
}
