import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * اختبار جماعي + قياس لود: بيتأكد إن عدد كبير من اليوزرز المزروعين يقدروا
 * يعملوا Login على مستوى الـ API، وبيطلع إحصائيات زمن الاستجابة
 * (min / p50 / p95 / p99 / max + عدد الطلبات في الثانية).
 *
 * مصدر الباسوردات:
 *   - اليوزرز الحقيقيون: api/prisma/seed-output/seed-passwords.csv
 *     (بيتولّد تلقائيًا مع كل زرع — users.json بقى بلا باسوردات بعد تنظيف الـ PII).
 *   - حسابات الاختبار: api/prisma/seed-data/test-users.json (فيها password صريح).
 *
 * التحكم:
 *   BULK_USERS=50    ./e2e.sh e2e/19-bulk-users.spec.ts   # عيّنة 50 (الافتراضي)
 *   BULK_USERS=all   ./e2e.sh e2e/19-bulk-users.spec.ts   # كل اليوزرز (~1760)
 *   BULK_ROLE=manager BULK_USERS=all ./e2e.sh e2e/19-bulk-users.spec.ts  # دور معيّن
 *   BULK_CONCURRENCY=50 BULK_USERS=all ./e2e.sh e2e/19-bulk-users.spec.ts  # ضغط أعلى
 */

const API = "http://localhost:4000";

interface BulkUser {
  username: string;
  password: string;
  role?: string;
  name: string;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(HERE, "..", "api", "prisma", "seed-data");
const CSV_PATH = join(HERE, "..", "api", "prisma", "seed-output", "seed-passwords.csv");

// نفس أولوية الـ seed: users.local.json (الداتا الحقيقية، خارج git) لو موجودة،
// وإلا users.json الصناعي. الملف الحقيقي فيه باسوردات صريحة؛ الصناعي مفيهوش
// (باسورداته العشوائية بتطلع في seed-passwords.csv).
const usersFile = existsSync(join(SEED_DIR, "users.local.json"))
  ? "users.local.json"
  : "users.json";
const seedUsers = JSON.parse(
  readFileSync(join(SEED_DIR, usersFile), "utf8"),
) as { username: string; password?: string; role: string; name: string }[];

// أدوار اليوزرز (الـ CSV مفيهوش role).
const roleByUsername = new Map<string, string>(
  seedUsers.map((u) => [u.username, u.role]),
);

// صف CSV: حقول بين علامات تنصيص، والاقتباس جواها بيتضاعف ("").
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  for (const m of line.matchAll(/"((?:[^"]|"")*)"/g)) {
    fields.push(m[1].replace(/""/g, '"'));
  }
  return fields;
}

function loadUsers(): BulkUser[] {
  const users: BulkUser[] = [];
  const seen = new Set<string>();

  // 1) اليوزرز اللي ليهم باسورد صريح في ملف الـ seed (حالة users.local.json الحقيقي).
  for (const u of seedUsers) {
    if (!u.password) continue;
    users.push({ username: u.username, password: u.password, name: u.name, role: u.role });
    seen.add(u.username);
  }

  // 2) اليوزرز اللي باسوردهم اتولّد عشوائي وقت الزرع (من الـ CSV).
  if (existsSync(CSV_PATH)) {
    const text = readFileSync(CSV_PATH, "utf8");
    // شيل الـ BOM (U+FEFF) لو موجود في أول الملف.
    const lines = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split(/\r?\n/);
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const [, username, name, password] = parseCsvLine(line);
      if (!username || !password || seen.has(username)) continue;
      users.push({ username, password, name, role: roleByUsername.get(username) });
    }
  }

  // 3) حسابات الاختبار (باسوردات ثابتة في الملف نفسه).
  const testUsersPath = join(SEED_DIR, "test-users.json");
  if (existsSync(testUsersPath)) {
    const testUsers = JSON.parse(readFileSync(testUsersPath, "utf8")) as {
      username: string;
      password?: string;
      role: string;
      name: string;
      mustChangePassword?: boolean;
    }[];
    for (const u of testUsers) {
      // اللي غيّروا باسوردهم خلال الحزمة (force-change) منقدرش نضمن باسوردهم هنا.
      if (!u.password || u.mustChangePassword) continue;
      users.push({ username: u.username, password: u.password, name: u.name, role: u.role });
    }
  }

  return users;
}

const allUsers = loadUsers();

// فلترة بالدور لو BULK_ROLE متحدد.
const roleFilter = process.env.BULK_ROLE;
const pool = roleFilter ? allUsers.filter((u) => u.role === roleFilter) : allUsers;

// حجم العيّنة (BULK_USERS): رقم أو "all". الافتراضي 50.
const raw = process.env.BULK_USERS ?? "50";
const count =
  raw.toLowerCase() === "all" ? pool.length : Math.min(Number(raw), pool.length);

// عيّنة موزّعة بالتساوي على كل القائمة (مش أول N بس) عشان تغطّي أقسام/أدوار مختلفة.
function sample(list: BulkUser[], n: number): BulkUser[] {
  if (n >= list.length) return list;
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
}
const users = sample(pool, count);

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

test.describe("Bulk User Login (load)", () => {
  test(`${users.length} users can log in via API`, async ({ request }) => {
    expect(
      users.length,
      "مفيش يوزرز — اتأكد إن الزرع اتشغّل وإن api/prisma/seed-output/seed-passwords.csv موجود (./e2e.sh بيولّده تلقائيًا).",
    ).toBeGreaterThan(0);

    // مهلة تتناسب مع العدد (bcrypt على السيرفر ~60-100ms لكل واحد).
    test.setTimeout(Math.max(60_000, users.length * 400));

    const failures: { username: string; status: number; reason: string }[] = [];
    const latencies: number[] = [];

    // batches متزامنة عشان نسرّع بدون ما نغرق السيرفر.
    const BATCH = Math.max(1, Number(process.env.BULK_CONCURRENCY ?? 20));
    const suiteStart = Date.now();

    for (let i = 0; i < users.length; i += BATCH) {
      const batch = users.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (u) => {
          const start = Date.now();
          const res = await request.post(`${API}/auth/login`, {
            data: { username: u.username, password: u.password },
          });
          latencies.push(Date.now() - start);
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
          } else if (u.role && body.user?.role !== u.role) {
            failures.push({
              username: u.username,
              status: res.status(),
              reason: `role mismatch: got ${body.user?.role}, expected ${u.role}`,
            });
          }
        }),
      );
    }

    const wallMs = Date.now() - suiteStart;
    const sorted = [...latencies].sort((a, b) => a - b);
    const mean = Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length);
    const passed = users.length - failures.length;

    console.log(
      `\n✅ نجح تسجيل الدخول لـ ${passed}/${users.length} يوزر` +
        (roleFilter ? ` (دور: ${roleFilter})` : "") +
        ".",
    );
    console.log(
      `📊 اللود: ${(users.length / (wallMs / 1000)).toFixed(1)} login/sec ` +
        `(concurrency=${BATCH}, إجمالي ${(wallMs / 1000).toFixed(1)}s)`,
    );
    console.log(
      `⏱️  زمن الاستجابة (ms): min=${sorted[0]} | mean=${mean} | ` +
        `p50=${percentile(sorted, 50)} | p95=${percentile(sorted, 95)} | ` +
        `p99=${percentile(sorted, 99)} | max=${sorted[sorted.length - 1]}`,
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
