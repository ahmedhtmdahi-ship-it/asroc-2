import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";

import { errorHandler } from "./middleware/errorHandler.js";
import { setupAuth } from "./plugins/jwt.js";
import { prisma } from "./db/prisma.js"; // ✅ إضافة استدعاء قاعدة البيانات
import { authRoutes } from "./modules/auth/auth.route.js";
import { healthRoutes } from "./modules/health/health.route.js";
import { requestRoutes } from "./modules/requests/requests.route.js";
import { userRoutes } from "./modules/users/users.route.js";
import { medicineRoutes } from "./modules/medicines/medicines.route.js";
import { auditRoutes }         from "./modules/audit/audit.route.js";
import { notificationRoutes } from "./modules/notifications/notifications.route.js";
import { securityRoutes }     from "./modules/security/security.route.js";
import { departmentRoutes }   from "./modules/departments/departments.route.js";
import {
  requestAttachmentRoutes,
  MAX_ATTACHMENT_BYTES,
} from "./modules/requests/requests.attachments.route.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  // ✅ إصلاح CORS عشان يقبل أكثر من origin
  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
  const allowedOrigins = corsOrigin.split(",").map((s) => s.trim());

  app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });

  // مرفقات الطلبات — ملف واحد لكل نداء وبحد حجم صارم على السيرفر.
  app.register(multipart, {
    limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
  });

  // ✅ Rate limit عام خفيف
  if (process.env.NODE_ENV !== "test") {
    app.register(rateLimit, {
      max: 200,
      timeWindow: "1 minute",
    });
  }

  setupAuth(app);
  app.setErrorHandler(errorHandler);

  // تسجيل تلقائي لعمليات الكتابة على مستوى HTTP.
  // مسارات /requests مستثناة — الـ service بتاعها بيسجّل أحداثها domain-level
  // بالتفاصيل (from/to/note)، والتسجيل هنا كان بيعمل صف مكرر لكل عملية.
  app.addHook("onSend", async (req, reply) => {
    const method = req.method;
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return;

    const routeUrl = req.routeOptions.url || req.url;
    if (routeUrl.startsWith("/requests")) return;

    const userId = req.authenticatedUser?.id;
    if (!userId) return;

    // Fire and forget — ما ننتظرش النتيجة عشان ما نبطئش الـ response
    void prisma.auditLog
      .create({
        data: {
          userId,
          userName: (req.user as { name?: string } | undefined)?.name ?? null,
          action: `${method} ${routeUrl}`,
          endpoint: req.url,
          method,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] || null,
        },
      })
      .catch(() => {
        // ignore
      });
  });

  // الـ modules
  app.register(healthRoutes, { prefix: "/health" });
  app.register(authRoutes, { prefix: "/auth" });
  app.register(requestRoutes, { prefix: "/requests" });
  app.register(requestAttachmentRoutes, { prefix: "/requests" });
  app.register(userRoutes, { prefix: "/users" });
  app.register(medicineRoutes, { prefix: "/medicines" });
  app.register(auditRoutes,         { prefix: "/audit-logs" });
  app.register(notificationRoutes,  { prefix: "/notifications" });
  app.register(securityRoutes,      { prefix: "/security-logs" });
  app.register(departmentRoutes,    { prefix: "/departments" });

  return app; // ✅ الـ return لسه في آخر الـ function
}