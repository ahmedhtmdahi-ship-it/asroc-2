import type { FastifyReply, FastifyRequest } from "fastify";

// شكل البيانات اللي بنوقّعها جوه الـ JWT.
interface AuthTokenPayload {
  sub: string; // معرّف المستخدم
  role: string;
  permissions: string[];
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthTokenPayload; // اللي بنوقّعه
    user: AuthTokenPayload; // اللي بيتقرأ من req.user
  }
}

declare module "fastify" {
  interface FastifyInstance {
    // preHandler بيتحقق من التوكن ويرفض بـ 401 لو غلط.
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
