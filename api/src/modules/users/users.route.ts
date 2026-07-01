import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma.js";

const listUsersQuerySchema = z.object({
  // roles=manager,office_manager  (اختياري)
  roles: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((r) => r.trim()).filter(Boolean) : undefined)),
});

export async function userRoutes(app: FastifyInstance) {
  // GET /users?roles=manager,office_manager  — قائمة المستخدمين بدون الـ hash
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    const { roles } = listUsersQuerySchema.parse(req.query);

    const users = await prisma.user.findMany({
      where: roles?.length ? { role: { in: roles as never } } : {},
      orderBy: { name: "asc" },
    });

    return users.map(({ passwordHash: _omit, ...u }) => u);
  });
}
