// تنسيق التواريخ الموحّد للواجهة — كان متكررًا بنسخ شبه متطابقة في 7 صفحات.

const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ar-EG", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value?: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return dateFormatter.format(date);
}

export function formatDateTime(value?: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return dateTimeFormatter.format(date);
}
