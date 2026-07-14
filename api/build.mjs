import { readFileSync } from "node:fs";
import esbuild from "esbuild";

// بناء الإنتاج: نجمّع كود الـ API + حزمة @asroc/shared (اللي بتصدّر .ts) في ملف
// JS واحد يتشغّل بـ node مباشرة — من غير tsx وقت التشغيل. باقي حزم npm بتفضل
// خارجية (external) في node_modules عشان ما نبنّدلش fastify/prisma وناخد مشاكلهم.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));
const external = Object.keys(pkg.dependencies ?? {}).filter((d) => d !== "@asroc/shared");

await esbuild.build({
  entryPoints: ["src/server.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: "dist/server.mjs",
  external,
  // interop: بعض الحزم CJS بتنادي require داخليًا — نوفّر require في سياق الـ ESM.
  banner: {
    js: "import { createRequire as ___cr } from 'node:module'; const require = ___cr(import.meta.url);",
  },
  logLevel: "info",
});
