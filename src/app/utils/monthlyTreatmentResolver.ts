import { profilesStore } from "@/app/store/profilesStore";

function normalizeArabicText(value?: string) {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

const monthlyTreatmentDoctorKeywords = ["روبير", "روبرت", "robert", "rober"];

export function findMonthlyTreatmentDoctor() {
  const users = profilesStore.getAll();

  return (
    users.find((user) => {
      const name = normalizeArabicText(user.name);
      const jobTitle = normalizeArabicText(user.jobTitle);
      const department = normalizeArabicText(user.department || user.workPlace);

      const isDoctor =
        user.role === "doctor" ||
        user.permissions?.includes("recommend_monthly_treatment") ||
        jobTitle.includes("طبيب") ||
        jobTitle.includes("دكتور");

      const isMonthlyTreatmentDoctor = monthlyTreatmentDoctorKeywords.some(
        (keyword) =>
          name.includes(normalizeArabicText(keyword)) ||
          jobTitle.includes(normalizeArabicText(keyword)) ||
          department.includes(normalizeArabicText(keyword))
      );

      return isDoctor && isMonthlyTreatmentDoctor;
    }) || null
  );
}

export function getMonthlyTreatmentDoctorId() {
  return findMonthlyTreatmentDoctor()?.id;
}

export function getMonthlyTreatmentDoctorName() {
  return findMonthlyTreatmentDoctor()?.name || "دكتور العلاج الشهري";
}
