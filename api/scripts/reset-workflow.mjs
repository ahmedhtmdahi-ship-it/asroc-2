// يمسح بيانات مسار الطلبات (طلبات + تابعينها + سجلات أمن + إشعارات) ويسيب
// المستخدمين والأدوية والأقسام زي ما هم. بيستخدمه الـ e2e globalSetup عشان كل
// تشغيلة تبدأ من حالة نظيفة (طلب واحد بس بيسري) وما تتعلقش بقايا تشغيلة فشلت.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.requestTimelineEvent.deleteMany({});
  await prisma.requestMedication.deleteMany({});
  await prisma.requestAttachment.deleteMany({});
  await prisma.referral.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.securityLog.deleteMany({});
  await prisma.medicalRequest.deleteMany({});

  // اربط قسم مدير الاختبار بيه عشان فلو إنشاء الطلب يلاقي «مدير مسؤول». الـ seed
  // بيحط test-manager في قسم حقيقي مربوط بمدير حقيقي مش موجود في قاعدة الاختبار،
  // فبنصحّح الربط هنا (idempotent) عشان الـ e2e يبقى محدَّد النتيجة.
  const testMgr = await prisma.user.findUnique({ where: { username: "test-manager" } });
  if (testMgr?.department) {
    await prisma.department.updateMany({
      where: { name: testMgr.department },
      data: { managerId: testMgr.id, managerFinancialNumber: testMgr.financialNumber },
    });
  }

  console.log("✅ reset-workflow: اتمسحت بيانات المسار وربطنا قسم الاختبار بمديره (المستخدمون/الأدوية زي ما هم)");
} finally {
  await prisma.$disconnect();
}
