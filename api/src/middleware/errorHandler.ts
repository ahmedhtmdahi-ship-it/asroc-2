import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

/**
 * معالج أخطاء موحّد — أي خطأ في أي route بيعدّي من هنا،
 * فالردود بتطلع بشكل ثابت بدل ما كل route يتصرّف لوحده.
 */
export function errorHandler(
  error: FastifyError | ZodError,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  // أخطاء التحقق من Zod → 400 مع تفاصيل الحقول
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "ValidationError",
      details: error.flatten().fieldErrors,
    });
  }

  const status = (error as FastifyError).statusCode ?? 500;

  // أخطاء السيرفر (5xx) بنسجّلها؛ أخطاء العميل (4xx) لأ
  if (status >= 500) {
    req.log.error(error);
  }

  return reply.status(status).send({
    error: error.name || "InternalServerError",
    message: status >= 500 ? "حدث خطأ داخلي" : error.message,
  });
}
