import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { env } from "../env.js";
import { prisma } from "../db/prisma.js";

/**
 * بنسجّل @fastify/jwt وبنضيف decorator اسمه `authenticate`
 * نستخدمه كـ preHandler على أي route محتاج تسجيل دخول.
 */
export function setupAuth(app: FastifyInstance) {
  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    // تثبيت الخوارزمية (defense-in-depth ضد algorithm confusion).
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

      // kill switch: لو الحساب اتعطّل بعد إصدار التوكن، امنع فورًا (مش مستنيين انتهاء الـ 12 ساعة).
      const account = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { isActive: true },
      });
      if (!account || !account.isActive) {
        return reply
          .code(401)
          .send({ error: "Unauthorized", message: "الحساب غير مفعّل" });
      }
    },
  );
}
