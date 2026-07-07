import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * اختبار جماعي: بيتأكد إن عدد كبير من اليوزرز المزروعين يقدروا يعملوا Login
 * على مستوى الـ API (أسرع بكتير من فتح المتصفح لكل واحد).
 *
 * العدد قابل للتحكم عشان تشوف "آخره كام يوزر":
 *   BULK_USERS=50    ./e2e.sh e2e/19-bulk-users.spec.ts   # عيّنة 50 (الافتراضي)
 *   BULK_USERS=all   ./e2e.sh e2e/19-bulk-users.spec.ts   # كل الـ 1759 يوزر
 *   BULK_ROLE=manager BULK_USERS=all ./e2e.sh e2e/19-bulk-users.spec.ts  # دور معيّن بس
 *
 * كل يوزر بنجرّب باسورده الأولي من الـ seed (الاسم الأول + الرقم المالي).
 */

const API = "http://localhost:4000";

interface SeedUser {
  username: string;
  password?: string;
  role: string;
  name: string;
  department?: string;
}

// بنقرأ نفس ملف الـ seed اللي الـ DB اتزرعت منه.
const seedPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "api",
  "prisma",
  "seed-data",
  "users.json",
);
const allUsers: SeedUser[] = JSON.parse(readFileSync(seedPath, "utf8")).filter(
  (u: SeedUser) => u.password,
);

// فلترة بالدور لو BULK_ROLE متحدد.
const roleFilter = process.env.BULK_ROLE;
const pool = roleFilter
  ? allUsers.filter((u) => u.role === roleFilter)
  : allUsers;

// تحديد حجم العيّنة (BULK_USERS): رقم، أو "all". الافتراضي 50.
const raw = process.env.BULK_USERS ?? "50";
const count =
  raw.toLowerCase() === "all" ? pool.length : Math.min(Number(raw), pool.length);

// عيّنة موزّعة بالتساوي على كل القائمة (مش أول N بس) عشان تغطّي أقسام/أدوار مختلفة.
function sample(list: SeedUser[], n: number): SeedUser[] {
  if (n >= list.length) return list;
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
}
const users = sample(pool, count);

test.describe("Bulk User Login", () => {
  test(`${users.length} users can log in via API`, async ({ request }) => {
    // مهلة تتناسب مع العدد (bcrypt على السيرفر ~60ms لكل واحد).
    test.setTimeout(Math.max(60_000, users.length * 400));

    const failures: { username: string; status: number; reason: string }[] = [];

    // batches متزامنة عشان نسرّع بدون ما نغرق السيرفر.
    const BATCH = 20;
    for (let i = 0; i < users.length; i += BATCH) {
      const batch = users.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (u) => {
          const res = await request.post(`${API}/auth/login`, {
            data: { username: u.username, password: u.password },
          });
          if (!res.ok()) {
            failures.push({
              username: u.username,
              status: res.status(),
              reason: "login failed",
            });
            return;
          }
          const body = await res.json();
          if (!body.token) {
            failures.push({
              username: u.username,
              status: res.status(),
              reason: "no token",
            });
          } else if (body.user?.role !== u.role) {
            failures.push({
              username: u.username,
              status: res.status(),
              reason: `role mismatch: got ${body.user?.role}, expected ${u.role}`,
            });
          }
        }),
      );
    }

    const passed = users.length - failures.length;
    console.log(
      `\n✅ نجح تسجيل الدخول لـ ${passed}/${users.length} يوزر` +
        (roleFilter ? ` (دور: ${roleFilter})` : "") +
        ".",
    );
    if (failures.length) {
      console.log(`❌ فشل ${failures.length}:`);
      for (const f of failures.slice(0, 20)) {
        console.log(`   • ${f.username} — ${f.status} — ${f.reason}`);
      }
      if (failures.length > 20) console.log(`   … و${failures.length - 20} غيرهم`);
    }

    expect(failures, JSON.stringify(failures.slice(0, 10), null, 2)).toHaveLength(
      0,
    );
  });
});
