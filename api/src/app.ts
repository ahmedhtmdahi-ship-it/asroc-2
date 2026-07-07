import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";

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

export function buildApp() {
  const app = Fastify({ logger: true });

  // ✅ إصلاح CORS عشان يقبل أكثر من origin
  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
  const allowedOrigins = corsOrigin.split(",").map((s) => s.trim());

  app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
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

  // ✅ الـ Hook جوه الـ function وقبل تسجيل الـ routes
  app.addHook("onSend", async (req, reply) => {
    const method = req.method;
    
    // نسجل فقط عمليات الكتابة
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const userId = req.authenticatedUser?.id;
      if (userId) {
        // Fire and forget — ما ننتظرش النتيجة عشان ما نبطئش الـ response
        prisma.auditLog.create({
          data: {
            userId,
            action: `${method} ${req.routeOptions.url || req.url}`,
            endpoint: req.url,
            method,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"] || null,
          },
        }).catch(() => {
          // لو فشل التسجيل ما نكسرش الـ request
        });
      }
    }
  });

  // الـ modules
  app.register(healthRoutes, { prefix: "/health" });
  app.register(authRoutes, { prefix: "/auth" });
  app.register(requestRoutes, { prefix: "/requests" });
  app.register(userRoutes, { prefix: "/users" });
  app.register(medicineRoutes, { prefix: "/medicines" });
  app.register(auditRoutes,         { prefix: "/audit-logs" });
  app.register(notificationRoutes,  { prefix: "/notifications" });
  app.register(securityRoutes,      { prefix: "/security-logs" });

  return app; // ✅ الـ return لسه في آخر الـ function
}