/**
 * خطأ بيحمل statusCode عشان معالج الأخطاء الموحّد يرجّعه بالكود الصح.
 */
export class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export const badRequest = (m = "طلب غير صالح") => new HttpError(400, m);
export const forbidden = (m = "صلاحية غير كافية") => new HttpError(403, m);
export const notFound = (m = "غير موجود") => new HttpError(404, m);
