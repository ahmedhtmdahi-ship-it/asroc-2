// تجهيز المشروع للتشغيل المحلي (بيشتغل على Windows / macOS / Linux):
//  1) ينشئ api/.env من المثال لو مش موجود.
//  2) يولّد Prisma Client، يطبّق الـ migrations، ويزرع البيانات (idempotent).
// بيتنادى تلقائيًا من "pnpm dev:all" — مش محتاج تشغّله بنفسك.
import { existsSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync("api/.env")) {
  copyFileSync("api/.env.example", "api/.env");
  console.log("✓ أنشأت api/.env من api/.env.example");
}

function run(cmd) {
  console.log("▶ " + cmd);
  execSync(cmd, { stdio: "inherit" });
}

run("pnpm --filter @asroc/api exec prisma generate");
run("pnpm --filter @asroc/api exec prisma migrate deploy");
run("pnpm --filter @asroc/api exec prisma db seed");

console.log("\n✅ التجهيز خلص — بنشغّل الباك والواجهة...\n");
