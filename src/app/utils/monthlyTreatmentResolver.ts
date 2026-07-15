import { profilesStore } from "@/app/store/profilesStore";

/**
 * إيجاد طبيب العلاج الشهري.
 *
 * البحث بالدور: أي طبيب نشط. (دليل /users/lookup مابقاش بيرجّع permissions —
 * تقليلًا لكشف خريطة الصلاحيات — والتوجيه الفعلي محكوم على السيرفر بالصلاحية
 * وقت التحويل، فالفرونت بيكفيه يقترح طبيب لعرض الاسم.)
 */
export function findMonthlyTreatmentDoctor() {
  const users = profilesStore.getAll().filter((u) => u.isActive !== false);
  return users.find((u) => u.role === "doctor") ?? null;
}

export function getMonthlyTreatmentDoctorId() {
  return findMonthlyTreatmentDoctor()?.id;
}

export function getMonthlyTreatmentDoctorName() {
  return findMonthlyTreatmentDoctor()?.name || "دكتور العلاج الشهري";
}
