import { z } from "zod";

/**
 * نتحقق من متغيّرات البيئة مرة واحدة عند الإقلاع.
 * لو ناقص متغيّر أو نوعه غلط، السيرفر يقع برسالة واضحة بدل ما يقع بعدين بشكل غامض.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default("0.0.0.0"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL مطلوب"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET لازم 16 حرف على الأقل"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ متغيّرات بيئة غير صالحة:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
