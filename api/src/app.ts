import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";

import { errorHandler } from "./middleware/errorHandler.js";
import { setupAuth } from "./plugins/jwt.js";
import { authRoutes } from "./modules/auth/auth.route.js";
import { healthRoutes } from "./modules/health/health.route.js";
import { requestRoutes } from "./modules/requests/requests.route.js";
import { userRoutes } from "./modules/users/users.route.js";
import { medicineRoutes } from "./modules/medicines/medicines.route.js";
import { auditRoutes }         from "./modules/audit/audit.route.js";
import { notificationRoutes } from "./modules/notifications/notifications.route.js";
import { securityRoutes }     from "./modules/security/security.route.js";
import { contractRoutes }     from "./modules/contracts/contracts.route.js";

/**
 * بنبني التطبيق هنا (من غير ما نشغّل الاستماع) عشان نقدر نختبره بسهولة.
 * كل feature module جديد بيتسجّل في المكان ده.
 */
export function buildApp() {
  const app = Fastify({ logger: true });

  const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
  app.register(cors, { origin: allowedOrigin });

  // Add rate limiting global config (can be customized per route).
  // بنعطّله في بيئة الاختبار عشان طلبات الاختبار المتتالية ما تتحظرش.
  if (process.env.NODE_ENV !== "test") {
    app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
    });
  }

  setupAuth(app);
  app.setErrorHandler(errorHandler);

  // الـ modules
  app.register(healthRoutes, { prefix: "/health" });
  app.register(authRoutes, { prefix: "/auth" });
  app.register(requestRoutes, { prefix: "/requests" });
  app.register(userRoutes, { prefix: "/users" });
  app.register(medicineRoutes, { prefix: "/medicines" });
  app.register(auditRoutes,         { prefix: "/audit-logs" });
  app.register(notificationRoutes,  { prefix: "/notifications" });
  app.register(securityRoutes,      { prefix: "/security-logs" });
  app.register(contractRoutes,      { prefix: "/contracts" });

  return app;
}
