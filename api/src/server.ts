import "dotenv/config";
import { buildApp } from "./app.js";
import { env } from "./env.js";
import { prisma } from "./db/prisma.js";

async function main() {
  // SQLite: WAL بيسمح بقراءات متوازية أثناء الكتابة (أفضل للتزامن على شبكة الشركة)،
  // و busy_timeout بيخلّي الاتصال يستنّى بدل ما يفشل فورًا لو الملف مقفول.
  try {
    await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;");
    await prisma.$executeRawUnsafe("PRAGMA busy_timeout=5000;");
  } catch (err) {
    console.warn("⚠️ تعذّر ضبط إعدادات SQLite (WAL/busy_timeout):", err);
  }

  const app = buildApp();
  const address = await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`ASROC API شغّال على ${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
