import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * حارس صلاحيات — يُستخدم كـ preHandler بعد `authenticate`.
 * بيسمح لو المستخدم عنده صلاحية "all" أو كل الصلاحيات المطلوبة.
 *
 *   app.get("/x", { preHandler: [app.authenticate, requirePermission("view_reports")] }, ...)
 */
export function requirePermission(...required: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const perms = req.user?.permissions ?? [];
    const allowed =
      perms.includes("all") || required.every((p) => perms.includes(p));

    if (!allowed) {
      return reply
        .code(403)
        .send({ error: "Forbidden", message: "صلاحية غير كافية" });
    }
  };
}
