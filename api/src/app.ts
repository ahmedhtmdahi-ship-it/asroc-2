import Fastify from "fastify";
import cors from "@fastify/cors";

import { errorHandler } from "./middleware/errorHandler.js";
import { setupAuth } from "./plugins/jwt.js";
import { authRoutes } from "./modules/auth/auth.route.js";
import { healthRoutes } from "./modules/health/health.route.js";

/**
 * بنبني التطبيق هنا (من غير ما نشغّل الاستماع) عشان نقدر نختبره بسهولة.
 * كل feature module جديد بيتسجّل في المكان ده.
 */
export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  setupAuth(app);
  app.setErrorHandler(errorHandler);

  // الـ modules
  app.register(healthRoutes, { prefix: "/health" });
  app.register(authRoutes, { prefix: "/auth" });

  return app;
}
