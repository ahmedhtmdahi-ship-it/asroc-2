import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";

import { env } from "../../env.js";
import { prisma } from "../../db/prisma.js";
import { badRequest, forbidden, notFound } from "../../lib/httpError.js";
import { isClosedStatus, type RequestStatus } from "./requests.workflow.js";
import { canReachRequest, resolveUser } from "./requests.access.js";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // نفس الحد المعروض في الواجهة

// الأنواع المسموحة — بنتحقق من التوقيع الفعلي للملف (magic bytes)،
// مش من الامتداد ولا الـ Content-Type اللي العميل بيدّعيه.
const TYPE_BY_SIGNATURE: Array<{ mime: string; ext: string; matches: (b: Buffer) => boolean }> = [
  { mime: "image/png",       ext: "png", matches: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg",      ext: "jpg", matches: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "application/pdf", ext: "pdf", matches: (b) => b.length > 4 && b.toString("latin1", 0, 5) === "%PDF-" },
];

const EXT_BY_MIME = new Map(TYPE_BY_SIGNATURE.map((t) => [t.mime, t.ext]));

function detectFileType(buffer: Buffer) {
  return TYPE_BY_SIGNATURE.find((t) => t.matches(buffer)) ?? null;
}

/** اسم الملف على القرص من صف الداتابيز — uuid + امتداد مشتق من النوع المكتشف.
 *  اسم الملف الأصلي لا يدخل المسار أبدًا (منع path traversal). */
function diskFileName(attachmentId: string, mime: string) {
  return `${attachmentId}.${EXT_BY_MIME.get(mime) ?? "bin"}`;
}

async function loadAccessibleRequest(requestId: string, req: Parameters<typeof resolveUser>[0]) {
  const request = await prisma.medicalRequest.findUnique({ where: { id: requestId } });
  if (!request) throw notFound("الطلب غير موجود");
  if (!canReachRequest(resolveUser(req), request)) {
    throw forbidden("غير مسموح بالوصول لمرفقات هذا الطلب");
  }
  return request;
}

export async function requestAttachmentRoutes(app: FastifyInstance) {
  // POST /requests/:id/attachments — ملف واحد لكل نداء (الواجهة بتكرر النداء).
  app.post<{ Params: { id: string } }>(
    "/:id/attachments",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const request = await loadAccessibleRequest(req.params.id, req);
      if (isClosedStatus(request.status as RequestStatus)) {
        throw badRequest("لا يمكن إضافة مرفقات لطلب مغلق");
      }

      const file = await req.file();
      if (!file) throw badRequest("لم يتم إرسال أي ملف");

      const buffer = await file.toBuffer(); // حد الحجم مطبّق في تسجيل الـ plugin
      const detected = detectFileType(buffer);
      if (!detected) {
        throw badRequest("نوع الملف غير مسموح — المسموح: PNG أو JPG أو PDF");
      }

      const user = resolveUser(req);
      const attachmentId = randomUUID();

      await mkdir(env.UPLOADS_DIR, { recursive: true });
      const diskPath = join(env.UPLOADS_DIR, diskFileName(attachmentId, detected.mime));
      await writeFile(diskPath, buffer);

      try {
        const created = await prisma.requestAttachment.create({
          data: {
            id: attachmentId,
            requestId: request.id,
            fileName: file.filename || `attachment.${detected.ext}`,
            fileType: detected.mime,
            fileSize: buffer.length,
            uploadedBy: user.sub,
          },
        });
        return reply.code(201).send(created);
      } catch (e) {
        // فشل تسجيل الصف → ما نسيبش ملف يتيم على القرص.
        await unlink(diskPath).catch(() => {});
        throw e;
      }
    },
  );

  // GET /requests/:id/attachments/:attachmentId — تنزيل بنفس قيود رؤية الطلب.
  app.get<{ Params: { id: string; attachmentId: string } }>(
    "/:id/attachments/:attachmentId",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const request = await loadAccessibleRequest(req.params.id, req);

      const attachment = await prisma.requestAttachment.findUnique({
        where: { id: req.params.attachmentId },
      });
      if (!attachment || attachment.requestId !== request.id) {
        throw notFound("المرفق غير موجود");
      }

      const diskPath = join(env.UPLOADS_DIR, diskFileName(attachment.id, attachment.fileType));
      return reply
        .type(attachment.fileType)
        .header(
          "content-disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        )
        .send(createReadStream(diskPath));
    },
  );
}
