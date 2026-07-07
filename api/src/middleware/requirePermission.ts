import type { FastifyRequest, FastifyReply } from "fastify";
import type { Permission } from "@asroc/shared/roles.js";

export function requirePermission(...perms: Permission[]) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    // ✅ نأخذ البيانات جاهزة من الـ authenticate اللي شغلناها قبل كده
    const user = req.authenticatedUser;

    if (!user) {
      return reply.code(401).send({ error: "Unauthorized", message: "لم يتم التحقق من المستخدم" });
    }

    // super_admin يتجاوز كل الصلاحيات
    if (user.role === "super_admin") return;

    const hasAll = perms.every((p) => user.permissions.includes(p));
    if (!hasAll) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "ليس لديك الصلاحية المطلوبة",
      });
    }
  };
}