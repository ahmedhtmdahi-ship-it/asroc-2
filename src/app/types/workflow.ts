export type RequestStatus =
  // Checkup manager approval
  | "pending"
  | "approved"
  | "rejected"
  | "postponed"
  | "cancelled"

  // Checkup security / doctor / pharmacy flow
  | "checked_out"
  | "in_diagnosis"
  | "prescribed"
  | "dispensed"
  | "returned"
  | "completed"

  // Monthly treatment flow
  | "pending_monthly_doctor"
  | "monthly_approved"
  | "monthly_rejected"
  | "monthly_modified"
  | "monthly_ready_pharmacy"
  | "monthly_dispensed"
  | "monthly_completed";

export const requestStatusLabels: Record<RequestStatus, string> = {
  pending: "بانتظار موافقة المدير",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
  postponed: "مؤجل",
  cancelled: "ملغي",

  checked_out: "تم تسجيل الخروج",
  in_diagnosis: "قيد الكشف",
  prescribed: "تمت كتابة الروشتة",
  dispensed: "تم الصرف",
  returned: "تم تسجيل العودة",
  completed: "مكتمل",

  pending_monthly_doctor: "بانتظار مراجعة طبيب العلاج الشهري",
  monthly_approved: "تمت الموافقة على العلاج الشهري",
  monthly_rejected: "تم رفض العلاج الشهري",
  monthly_modified: "تم تعديل العلاج الشهري",
  monthly_ready_pharmacy: "جاهز للصرف من الصيدلية",
  monthly_dispensed: "تم صرف العلاج الشهري",
  monthly_completed: "مكتمل",
};

export const closedRequestStatuses: RequestStatus[] = [
  "completed",
  "rejected",
  "cancelled",
  "monthly_rejected",
  "monthly_completed",
];

export const activeCheckupStatuses: RequestStatus[] = [
  "pending",
  "approved",
  "postponed",
  "checked_out",
  "in_diagnosis",
  "prescribed",
  "dispensed",
  "returned",
];

export const activeMonthlyTreatmentStatuses: RequestStatus[] = [
  "pending_monthly_doctor",
  "monthly_approved",
  "monthly_modified",
  "monthly_ready_pharmacy",
  "monthly_dispensed",
];

export function isClosedStatus(status: RequestStatus) {
  return closedRequestStatuses.includes(status);
}

export function isMonthlyTreatmentStatus(status: RequestStatus) {
  return activeMonthlyTreatmentStatuses.includes(status);
}

export function isCheckupStatus(status: RequestStatus) {
  return activeCheckupStatuses.includes(status);
}