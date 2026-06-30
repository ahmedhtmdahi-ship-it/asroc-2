import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { env } from "../env.js";

/**
 * بنسجّل @fastify/jwt وبنضيف decorator اسمه `authenticate`
 * نستخدمه كـ preHandler على أي route محتاج تسجيل دخول.
 */
export function setupAuth(app: FastifyInstance) {
  app.register(fastifyJwt, { secret: env.JWT_SECRET });

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
    },
  );
}
