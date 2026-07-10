/**
 * توليد نسخة وهمية من api/prisma/seed-data/users.json — بدون أي بيانات شخصية حقيقية.
 *
 * يحافظ على: الأدوار، الأقسام، الصلاحيات، الوظائف، طبيعة العمل، الـ ids، الـ usernames
 * (عشان الربط بالرقم المالي والاختبارات تفضل شغالة).
 * يستبدل: الأسماء (مولّدة)، الأرقام القومية (صيغة صحيحة لأشخاص غير موجودين)،
 * التليفونات (عشوائية)، ويحذف حقل password نهائيًا (seed.ts بيولّد باسوردات عشوائية).
 *
 * حتمي (deterministic): نفس المدخلات → نفس المخرجات، عشان الـ diffs تبقى مقروءة.
 *
 * التشغيل:  node scripts/generate-fake-seed.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USERS_PATH = join(ROOT, "api/prisma/seed-data/users.json");

// ─── RNG حتمي (mulberry32) ─────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── قوائم أسماء عربية شائعة (تركيبها لا يطابق أشخاصًا بعينهم) ─────────
const FIRST = [
  "أحمد", "محمد", "محمود", "مصطفى", "إبراهيم", "خالد", "عمرو", "طارق", "حسن", "حسين",
  "سيد", "عادل", "عصام", "أشرف", "وائل", "هاني", "سامح", "شريف", "ياسر", "عماد",
  "كريم", "رامي", "تامر", "أيمن", "علاء", "مجدي", "صلاح", "فتحي", "جمال", "رضا",
  "سامي", "فؤاد", "نبيل", "منير", "حمدي", "شوقي", "لطفي", "زكريا", "عبدالله", "عبدالرحمن",
];
const MIDDLE = [
  "محمد", "أحمد", "علي", "حسن", "إبراهيم", "محمود", "عبدالعزيز", "عبدالفتاح", "كامل", "أمين",
  "رشاد", "فاروق", "صابر", "شحاتة", "عوض", "سليم", "حلمي", "أنور", "رمضان", "شعبان",
  "توفيق", "حامد", "راشد", "سعيد", "فهمي", "نصر", "بكري", "زيدان", "عاشور", "غريب",
];
const LAST = [
  "السيد", "عبدالحميد", "الشافعي", "الجندي", "أبوزيد", "الدسوقي", "البنا", "الخولي", "عاشور", "بدوي",
  "شلبي", "الفقي", "حجازي", "الطنطاوي", "عامر", "سلامة", "الغزالي", "مرسي", "الحسيني", "قنديل",
  "درويش", "الشاذلي", "غنيم", "أبوالعلا", "الصاوي", "زهران", "عفيفي", "البحيري", "شاهين", "منصور",
];

function fakeName(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return `${pick(FIRST)} ${pick(MIDDLE)} ${pick(MIDDLE)} ${pick(LAST)}`;
}

// رقم قومي بصيغة صحيحة شكليًا (قرن 2/3 + تاريخ ميلاد صالح + محافظة + مسلسل)
// لكنه عشوائي — لا يطابق شخصًا حقيقيًا إلا بالصدفة البحتة.
function fakeNationalId(rng, usedSet) {
  for (;;) {
    const century = rng() < 0.7 ? "2" : "3";
    const yy = String(Math.floor(rng() * 40) + (century === "2" ? 55 : 0)).padStart(2, "0");
    const mm = String(Math.floor(rng() * 12) + 1).padStart(2, "0");
    const dd = String(Math.floor(rng() * 28) + 1).padStart(2, "0");
    const gov = String(Math.floor(rng() * 29) + 1).padStart(2, "0");
    const serial = String(Math.floor(rng() * 99999)).padStart(5, "0");
    const id = `${century}${yy}${mm}${dd}${gov}${serial}`;
    if (!usedSet.has(id)) {
      usedSet.add(id);
      return id;
    }
  }
}

function fakePhone(rng, usedSet) {
  for (;;) {
    const prefix = ["010", "011", "012", "015"][Math.floor(rng() * 4)];
    const rest = String(Math.floor(rng() * 1e8)).padStart(8, "0");
    const phone = `${prefix}${rest}`;
    if (!usedSet.has(phone)) {
      usedSet.add(phone);
      return phone;
    }
  }
}

// الحسابات الوظيفية/الاختبارية أسماؤها عامة أصلًا — نسيبها زي ما هي.
const KEEP_NAME = new Set(["admin", "test-doctor", "test-pharmacy", "test-office-mgr", "test-pension"]);

const users = JSON.parse(readFileSync(USERS_PATH, "utf8"));
const usedIds = new Set();
const usedPhones = new Set();
const usedNames = new Set();

const out = users.map((u, i) => {
  const rng = mulberry32(0xa5c0c + i * 2654435761);

  let name = KEEP_NAME.has(u.username) ? u.name : fakeName(rng);
  // ضمان عدم تكرار الاسم الرباعي بالكامل
  while (!KEEP_NAME.has(u.username) && usedNames.has(name)) name = fakeName(rng);
  usedNames.add(name);

  const fake = {
    ...u,
    name,
    ...(u.nationalId ? { nationalId: fakeNationalId(rng, usedIds) } : {}),
    ...(u.phone ? { phone: fakePhone(rng, usedPhones) } : {}),
  };
  delete fake.password; // الباسوردات بيولّدها seed.ts عشوائيًا — مفيش نص صريح في الريبو.
  return fake;
});

writeFileSync(USERS_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`✅ اتولّد ${out.length} مستخدم وهمي في ${USERS_PATH}`);
console.log("   (الأسماء والأرقام القومية والتليفونات وهمية، وحقل password اتشال نهائيًا)");
