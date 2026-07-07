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
import { readFileSync } from "node:fs";
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

const mockUsers = loadJson<SeedUser[]>("users.json");
const mockDepartments = loadJson<SeedDepartment[]>("departments.json");
const medicinesSeed = loadJson<SeedMedicine[]>("medicines.json");

async function seedUsers() {
  console.log(`\n👤 زرع ${mockUsers.length} مستخدم (مع bcrypt)...`);
  let done = 0;
  let missingPassword = 0;

  for (const u of mockUsers) {
    const plain = u.password?.trim() || u.financialNumber || u.username;
    if (!u.password?.trim()) missingPassword++;

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
      // كل الحسابات المزروعة لازم تغيّر الباسورد أول دخول (أمان on-prem).
      mustChangePassword: true,
    };

    await prisma.user.upsert({
      where: { id: u.id },
      create: { id: u.id, ...data },
      update: data,
    });

    if (++done % 200 === 0) console.log(`   ... ${done}/${mockUsers.length}`);
  }

  console.log(`✅ المستخدمون: ${done} (تم توليد باسورد احتياطي لـ ${missingPassword} بدون باسورد)`);
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
      where: { id: d.id },
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

  // حارس idempotency: لو فيه بيانات بالفعل، ما نعيدش الزرع (إلا بالإجبار).
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.SEED_FORCE !== "1") {
    console.log(
      `⏭️  فيه ${existingUsers} مستخدم بالفعل — تخطّي الزرع. (استخدم SEED_FORCE=1 للإجبار)`,
    );
    return;
  }

  await seedUsers();
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