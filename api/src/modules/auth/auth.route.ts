import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";

import { prisma } from "../../db/prisma.js";
import { parsePermissions } from "../../lib/permissions.js";
import { changePasswordSchema, loginSchema } from "./auth.schema.js";
import { verifyCredentials } from "./auth.service.js";

const BCRYPT_ROUNDS = 10;

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login — يتحقق ويرجّع JWT + بيانات المستخدم (بدون الـ hash)
  // الـ rate-limit plugin مش بيتسجّل أصلاً في NODE_ENV=test (شوف app.ts)،
  // فالإعداد ده بيتجاهل تلقائيًا وقت الاختبار.
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
      {
        sub: user.id,
        name: user.name,
        role: user.role,
        permissions,
        mustChangePassword: user.mustChangePassword,
      },
      { expiresIn: "12h" },
    );

    const { passwordHash: _omit, ...rest } = user;
    return { token, user: { ...rest, permissions } };
  });

  // GET /auth/me — بيانات المستخدم الحالي (authenticate بيتأكد إن الحساب مفعّل)
  app.get("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) {
      return reply.code(404).send({ error: "NotFound", message: "المستخدم غير موجود" });
    }

    const { passwordHash: _omit, ...rest } = user;
    return { user: { ...rest, permissions: parsePermissions(rest.permissions) } };
  });

  // POST /auth/change-password — تغيير الباسورد (وبيصفّر mustChangePassword)
  app.post("/change-password", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) {
      return reply.code(404).send({ error: "NotFound", message: "المستخدم غير موجود" });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return reply
        .code(400)
        .send({ error: "BadRequest", message: "كلمة المرور الحالية غير صحيحة" });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    const permissions = parsePermissions(updated.permissions);
    const token = app.jwt.sign(
      {
        sub: updated.id,
        name: updated.name,
        role: updated.role,
        permissions,
        mustChangePassword: false,
      },
      { expiresIn: "12h" },
    );

    const { passwordHash: _omit, ...rest } = updated;
    return { token, user: { ...rest, permissions } };
  });
}
