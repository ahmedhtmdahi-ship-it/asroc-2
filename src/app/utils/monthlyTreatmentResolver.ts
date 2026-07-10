import { profilesStore } from "@/app/store/profilesStore";

/**
 * إيجاد طبيب العلاج الشهري.
 *
 * كان البحث بيتم بمطابقة اسم شخص بعينه ("روبير") — يعني لو الطبيب اتغيّر
 * يلزم deploy جديد، ومع بيانات الـ seed الحالية مفيش أي تطابق أصلًا.
 *
 * البحث الآن بالصلاحية/الدور (من الأدق للأعم):
 *  1) طبيب معه صلاحية recommend_monthly_treatment
 *  2) أي مستخدم معه الصلاحية دي
 *  3) أي طبيب نشط (fallback أخير عشان الفلو ما يقفش)
 */
export function findMonthlyTreatmentDoctor() {
  const users = profilesStore.getAll().filter((u) => u.isActive !== false);

  return (
    users.find(
      (u) =>
        u.role === "doctor" &&
        u.permissions?.includes("recommend_monthly_treatment"),
    ) ??
    users.find((u) => u.permissions?.includes("recommend_monthly_treatment")) ??
    users.find((u) => u.role === "doctor") ??
    null
  );
}

export function getMonthlyTreatmentDoctorId() {
  return findMonthlyTreatmentDoctor()?.id;
}

export function getMonthlyTreatmentDoctorName() {
  return findMonthlyTreatmentDoctor()?.name || "دكتور العلاج الشهري";
}
