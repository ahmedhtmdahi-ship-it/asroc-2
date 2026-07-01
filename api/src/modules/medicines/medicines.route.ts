import type { FastifyInstance } from "fastify";

import { prisma } from "../../db/prisma.js";

export async function medicineRoutes(app: FastifyInstance) {
  // GET /medicines — كل الأدوية مرتّبة بالاسم
  app.get("/", { preHandler: [app.authenticate] }, async () => {
    return prisma.medicine.findMany({ orderBy: { name: "asc" } });
  });
}
