/**
 * زرع البيانات الأولية في قاعدة البيانات من لقطات JSON (api/prisma/seed-data).
 *
 * - الباسوردات النصية بتتحوّل لـ bcrypt hash (مرة واحدة هنا، على السيرفر).
 * - upsert في كل حاجة → السكربت آمن لإعادة التشغيل (idempotent).
 * - بنحافظ على الـ ids الأصلية (USER-50, MED-00001, ...) عشان المراجع تفضل صحيحة.
 * - بيتخطّى الزرع لو فيه مستخدمين بالفعل (إلا لو SEED_FORCE=1) عشان إعادة التشغيل تبقى سريعة.
 *
 * البيانات مخزّنة كـ JSON جوه الـ backend (مش في الـ frontend) عشان تشتغل جوه صورة الـ Docker.
 * التشغيل:  cd api && pnpm db:seed
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import bcrypt from "bcryptjs";
// Avoid requiring @types/node in the project: provide a minimal `process` typing
// Include `exit` because this script calls process.exit(1) on failure.
declare const process: {
  env: { [key: string]: string | undefined };
  exit(code?: number): never;
};
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

const SEED_DIR = join(dirname(fileURLToPath(import.meta.url)), "seed-data");

interface SeedUser {
  id: string;
  username: string;
  /** موجود فقط في test-users.json (حسابات صناعية) — ملف الإنتاج بلا باسوردات نهائيًا. */
  password?: string;
  financialNumber?: string;
  name: string;
  jobTitle?: string;
  workPlace?: string;
  department?: string;
  nationalId?: string;
  phone?: string;
  workType?: string;
  role: string;
  permissions?: string[];
  isActive?: boolean;
  mustChangePassword?: boolean;
}

interface SeedDepartment {
  id: string;
  name: string;
  managerId?: string;
  managerFinancialNumber?: string;
}

interface SeedMedicine {
  id: string;
  name: string;
  unit: string;
  currentStock?: number | null;
  minimumStock?: number | null;
  category?: string;
  activeIngredient?: string;
  isActive?: boolean;
}

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(SEED_DIR, name), "utf8")) as T;
}

// users.local.json = الداتا الحقيقية (خارج git — شوف api/.gitignore). لو موجودة
// بتتفضّل على users.json الصناعي. دي وسيلة تسليم الداتا الفعلية للـ on-prem.
const localUsersPath = join(SEED_DIR, "users.local.json");
const useLocalUsers = existsSync(localUsersPath);
const mockUsers = useLocalUsers
  ? loadJson<SeedUser[]>("users.local.json")
  : loadJson<SeedUser[]>("users.json");
const mockDepartments = loadJson<SeedDepartment[]>("departments.json");
const medicinesSeed = loadJson<SeedMedicine[]>("medicines.json");

// حسابات الاختبار (باسوردات ثابتة معروفة) تُزرع فقط خارج الإنتاج.
const testUsersPath = join(SEED_DIR, "test-users.json");
const testUsers: SeedUser[] =
  process.env.NODE_ENV !== "production" && existsSync(testUsersPath)
    ? loadJson<SeedUser[]>("test-users.json")
    : [];

// باسورد عشوائي 12 حرف يستوفي السياسة (حرف + رقم على الأقل).
function randomPassword(): string {
  for (;;) {
    const candidate = randomBytes(9).toString("base64url").slice(0, 12);
    if (/[a-zA-Z]/.test(candidate) && /[0-9]/.test(candidate)) return candidate;
  }
}

async function seedUsers() {
  const all = [...mockUsers, ...testUsers];
  console.log(
    `\n👤 زرع ${all.length} مستخدم (مع bcrypt) — المصدر: ${useLocalUsers ? "users.local.json (داتا حقيقية)" : "users.json (داتا صناعية)"}...`,
  );
  let done = 0;

  // الباسوردات المولّدة بتتكتب CSV خارج git (المجلد في .gitignore) —
  // دي الوسيلة الوحيدة لتسليم باسورد أول دخول، ومفيش نص صريح في الريبو.
  const generated: string[][] = [];

  const adminEnvPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (!adminEnvPassword && process.env.NODE_ENV === "production") {
    console.error(
      "❌ في الإنتاج لازم تحدد SEED_ADMIN_PASSWORD (باسورد حساب admin) قبل الزرع.",
    );
    process.exit(1);
  }

  for (const u of all) {
    let plain = u.password?.trim();
    if (u.username === "admin") plain = adminEnvPassword || plain;
    if (!plain) {
      plain = randomPassword();
      generated.push([u.financialNumber ?? "", u.username, u.name, plain]);
    }

    const passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS);

    const data = {
      username: u.username,
      passwordHash,
      financialNumber: u.financialNumber ?? null,
      name: u.name,
      jobTitle: u.jobTitle ?? null,
      workPlace: u.workPlace ?? null,
      department: u.department ?? null,
      nationalId: u.nationalId ?? null,
      phone: u.phone ?? null,
      workType: u.workType ?? null,
      // Prisma doesn't export a UserRole type in some client versions; cast to any to avoid TS errors.
      role: u.role as any,
      permissions: JSON.stringify(u.permissions ?? []),
      isActive: u.isActive ?? true,
      // الافتراضي: تغيير الباسورد أول دخول (أمان on-prem). حسابات test مستثناة صراحةً.
      mustChangePassword: u.mustChangePassword ?? true,
    };

    await prisma.user.upsert({
      where: { id: u.id },
      create: { id: u.id, ...data },
      update: data,
    });

    if (++done % 200 === 0) console.log(`   ... ${done}/${all.length}`);
  }

  if (generated.length > 0) {
    const outDir = join(SEED_DIR, "..", "seed-output");
    mkdirSync(outDir, { recursive: true });
    const csvPath = join(outDir, "seed-passwords.csv");
    const csv = [["financialNumber", "username", "name", "password"], ...generated]
      .map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    writeFileSync(csvPath, "﻿" + csv, "utf8");
    console.log(`🔑 اتولّد باسورد عشوائي لـ ${generated.length} مستخدم → ${csvPath}`);
    console.log("   (الملف خارج git — وزّعه بأمان ثم امسحه. كل الحسابات مطالبة بتغييره أول دخول.)");
    if (!adminEnvPassword) {
      console.log("⚠️  SEED_ADMIN_PASSWORD مش متحدد — باسورد admin عشوائي وموجود في الـ CSV.");
    }
  }

  console.log(`✅ المستخدمون: ${done} (منهم ${testUsers.length} حساب اختبار)`);
}

async function seedDepartments() {
  console.log(`\n🏢 زرع ${mockDepartments.length} قسم...`);
  for (const d of mockDepartments) {
    const data = {
      name: d.name,
      managerId: d.managerId ?? null,
      managerFinancialNumber: d.managerFinancialNumber ?? null,
    };
    await prisma.department.upsert({
     where: { name: d.name },
     create: { id: d.id, ...data },
     update: data,
   });
  }
  console.log(`✅ الأقسام: ${mockDepartments.length}`);
}

async function seedMedicines() {
  console.log(`\n💊 زرع ${medicinesSeed.length} دواء...`);
  let done = 0;
  for (const m of medicinesSeed) {
    const data = {
      name: m.name,
      unit: m.unit,
      currentStock: m.currentStock ?? null,
      minimumStock: m.minimumStock ?? null,
      category: m.category || null,
      activeIngredient: m.activeIngredient || null,
      isActive: m.isActive ?? true,
    };
    await prisma.medicine.upsert({
      where: { id: m.id },
      create: { id: m.id, ...data },
      update: data,
    });
    if (++done % 500 === 0) console.log(`   ... ${done}/${medicinesSeed.length}`);
  }
  console.log(`✅ الأدوية: ${medicinesSeed.length}`);
}

async function main() {
  console.log("🌱 بدء زرع قاعدة البيانات...");

  // حارس idempotency على المستخدمين فقط — الأقسام والأدوية upsert آمنة دايمًا.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.SEED_FORCE !== "1") {
    console.log(
      `⏭️  فيه ${existingUsers} مستخدم بالفعل — تخطّي زرع المستخدمين فقط. (SEED_FORCE=1 للإجبار)`,
    );
  } else {
    await seedUsers();
  }

  await seedDepartments();
  await seedMedicines();
  console.log("\n🎉 تم الزرع بنجاح.");
}

main()
  .catch((e) => {
    console.error("❌ فشل الزرع:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });