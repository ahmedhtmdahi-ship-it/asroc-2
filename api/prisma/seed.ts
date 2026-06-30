/**
 * زرع البيانات الأولية في Postgres من ملفات الداتا الحالية في الـ frontend.
 *
 * - الباسوردات النصية بتتحوّل لـ bcrypt hash (مرة واحدة هنا، على السيرفر).
 * - upsert في كل حاجة → السكربت آمن لإعادة التشغيل (idempotent).
 * - بنحافظ على الـ ids الأصلية (USER-50, MED-00001, ...) عشان المراجع تفضل صحيحة.
 *
 * التشغيل:  cd api && pnpm db:seed
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// ملفات الداتا في الـ frontend — بتستخدم `import type` بس، فمفيش imports وقت التشغيل.
import { mockUsers } from "../../src/app/data/mockUsers";
import { mockDepartments } from "../../src/app/data/mockDepartments";
import { medicinesSeed } from "../../src/app/data/medicinesSeed";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

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
      role: u.role,
      permissions: u.permissions,
      isActive: u.isActive ?? true,
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
