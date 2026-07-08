import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { env } from "../env.js";
import { prisma } from "../db/prisma.js";
import type { UserRole, Permission } from "@asroc/shared/roles.js";

// ✅ توسيع نوع الـ Request عشان نوفر البيانات للـ middleware
// ملاحظة: req.user (شكل التوكن) متعرّف في types/fastify.d.ts عبر FastifyJWT —
// هنا بنضيف بس authenticatedUser (نسخة حيّة من الداتابيز) من غير ما نعيد تعريف user.
declare module "fastify" {
  interface FastifyRequest {
    authenticatedUser?: {
      id: string;
      role: UserRole;
      permissions: Permission[];
      department: string | null;
      isActive: boolean;
    };
  }
}

export function setupAuth(app: FastifyInstance) {
  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { algorithm: "HS256" },
    verify: { algorithms: ["HS256"] },
  });

  app.decorate(
    "authenticate",
    async function (req: FastifyRequest, reply: FastifyReply) {
      try {
        await req.jwtVerify();
      } catch {
        return reply
          .code(401)
          .send({ error: "Unauthorized", message: "توكن غير صالح أو منتهي" });
      }

      // ✅ نجللب البيانات مرة واحدة هنا
      const account = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: {
          id: true,
          role: true,
          permissions: true,
          department: true,
          isActive: true,
        },
      });

      if (!account || !account.isActive) {
        return reply
          .code(401)
          .send({ error: "Unauthorized", message: "الحساب غير مفعّل" });
      }

      // ✅ نحفظها في الـ request عشان middleware/requirePermission.js يقرأها من هنا
      req.authenticatedUser = {
        id: account.id,
        role: account.role as UserRole,
        permissions: JSON.parse(account.permissions) as Permission[],
        department: account.department,
        isActive: account.isActive,
      };
    },
  );
}