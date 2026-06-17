import { mockUsers } from "@/app/data/mockUsers";

function normalizeArabicText(value?: string) {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

const monthlyTreatmentDoctorKeywords = [
  "روبير",
  "روبرت",
  "robert",
  "rober",
];

export function findMonthlyTreatmentDoctor() {
  return (
    mockUsers.find((user) => {
      const name = normalizeArabicText(user.name);
      const jobTitle = normalizeArabicText(user.jobTitle);
      const department = normalizeArabicText(user.department || user.workPlace);

      const isDoctor =
        user.role === "doctor" ||
        user.permissions?.includes("recommend_monthly_treatment") ||
        jobTitle.includes("طبيب") ||
        jobTitle.includes("دكتور");

      const isMonthlyTreatmentDoctor = monthlyTreatmentDoctorKeywords.some(
        (keyword) => {
          const normalizedKeyword = normalizeArabicText(keyword);

          return (
            name.includes(normalizedKeyword) ||
            jobTitle.includes(normalizedKeyword) ||
            department.includes(normalizedKeyword)
          );
        }
      );

      return isDoctor && isMonthlyTreatmentDoctor;
    }) || null
  );
}

export function getMonthlyTreatmentDoctorId() {
  const doctor = findMonthlyTreatmentDoctor();

  return doctor?.id;
}

export function getMonthlyTreatmentDoctorName() {
  const doctor = findMonthlyTreatmentDoctor();

  return doctor?.name || "دكتور العلاج الشهري";
}