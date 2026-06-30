import type { FastifyInstance } from "fastify";

import { prisma } from "../../db/prisma.js";
import { loginSchema } from "./auth.schema.js";
import { verifyCredentials } from "./auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login — يتحقق ويرجّع JWT + بيانات المستخدم (بدون الـ hash)
  app.post("/login", async (req, reply) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await verifyCredentials(username, password);
    if (!user) {
      return reply
        .code(401)
        .send({ error: "Unauthorized", message: "بيانات الدخول غير صحيحة" });
    }

    const token = app.jwt.sign(
      { sub: user.id, name: user.name, role: user.role, permissions: user.permissions },
      { expiresIn: "12h" },
    );

    const { passwordHash: _omit, ...safeUser } = user;
    return { token, user: safeUser };
  });

  // GET /auth/me — بيانات المستخدم الحالي من التوكن
  app.get("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) {
      return reply.code(404).send({ error: "NotFound", message: "المستخدم غير موجود" });
    }

    const { passwordHash: _omit, ...safeUser } = user;
    return { user: safeUser };
  });
}
