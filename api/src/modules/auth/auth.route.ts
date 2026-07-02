import type { FastifyInstance } from "fastify";

import { prisma } from "../../db/prisma.js";
import { loginSchema } from "./auth.schema.js";
import { verifyCredentials } from "./auth.service.js";

function parsePermissions(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login — يتحقق ويرجّع JWT + بيانات المستخدم (بدون الـ hash)
  app.post("/login", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await verifyCredentials(username, password);
    if (!user) {
      return reply
        .code(401)
        .send({ error: "Unauthorized", message: "بيانات الدخول غير صحيحة" });
    }

    const permissions = parsePermissions(user.permissions);
    const token = app.jwt.sign(
      { sub: user.id, name: user.name, role: user.role, permissions },
      { expiresIn: "12h" },
    );

    const { passwordHash: _omit, ...rest } = user;
    return { token, user: { ...rest, permissions } };
  });

  // GET /auth/me — بيانات المستخدم الحالي من التوكن
  app.get("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) {
      return reply.code(404).send({ error: "NotFound", message: "المستخدم غير موجود" });
    }

    const { passwordHash: _omit, ...rest } = user;
    return { user: { ...rest, permissions: parsePermissions(rest.permissions) } };
  });
}
