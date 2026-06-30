import type { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma.js";

/**
 * فحوصات الصحة:
 * - /health/live  : العملية شغّالة (من غير ما نلمس أي dependency)
 * - /health/ready : نقدر نوصل لقاعدة البيانات فعلاً؟
 */
export async function healthRoutes(app: FastifyInstance) {
  app.get("/live", async () => ({ status: "ok" }));

  app.get("/ready", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", db: "up" };
    } catch {
      return reply.status(503).send({ status: "error", db: "down" });
    }
  });
}
