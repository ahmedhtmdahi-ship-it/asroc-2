// توحيد النص العربي للمقارنة: مسافات موحّدة، صور الألف → ا، ى → ي، ة → ه،
// و‏toLowerCase للحروف اللاتينية اللي بتظهر في بعض أسماء الأقسام.
// النسخة الوحيدة — كانت متكررة في managerResolver وdepartmentsStore.
export function normalizeArabicText(value?: string) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}
