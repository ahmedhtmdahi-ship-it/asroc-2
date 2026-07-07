// مصدر واحد لحالات طلب الكشف الطبي والانتقالات المسموح بها بينها.
// كان هذا المنطق مكررًا يدويًا في الباك (requests.workflow.ts) والفرونت
// (types/workflow.ts + store/workflowStore.ts) — أي تعديل هنا ينعكس على الطرفين.

import type { Permission } from "./roles.js";

export const REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "postponed",
  "cancelled",
  "checked_out",
  "in_diagnosis",
  "prescribed",
  "dispensed",
  "returned",
  "completed",
  "pending_monthly_doctor",
  "monthly_approved",
  "monthly_rejected",
  "monthly_modified",
  "monthly_ready_pharmacy",
  "monthly_dispensed",
  "monthly_completed",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

// التحويلات المسموح بها من كل حالة.
export const statusFlow: Record<RequestStatus, RequestStatus[]> = {
  // مسار الكشف
  pending: ["approved", "rejected", "postponed", "cancelled"],
  approved: ["checked_out"],
  checked_out: ["in_diagnosis"],
  in_diagnosis: ["prescribed"],
  prescribed: ["dispensed"],
  dispensed: ["returned"],
  returned: ["completed"],
  completed: [],
  rejected: [],
  postponed: ["pending", "cancelled"],
  cancelled: [],
  // مسار العلاج الشهري
  pending_monthly_doctor: [
    "monthly_approved",
    "monthly_rejected",
    "monthly_modified",
    "cancelled",
  ],
  monthly_approved: ["monthly_ready_pharmacy"],
  monthly_modified: ["monthly_ready_pharmacy", "monthly_rejected"],
  monthly_ready_pharmacy: ["monthly_dispensed"],
  monthly_dispensed: ["monthly_completed"],
  monthly_rejected: [],
  monthly_completed: [],
};

export function canMove(from: RequestStatus, to: RequestStatus): boolean {
  return statusFlow[from]?.includes(to) ?? false;
}

// الحقل الزمني اللي بيتحدّث عند الوصول لكل حالة.
export const statusTimestampField: Partial<Record<RequestStatus, string>> = {
  approved: "approvedAt",
  checked_out: "checkedOutAt",
  in_diagnosis: "diagnosedAt",
  dispensed: "dispensedAt",
  returned: "returnedAt",
  completed: "completedAt",
  monthly_dispensed: "dispensedAt",
  monthly_completed: "completedAt",
};

// الصلاحية المطلوبة لتنفيذ كل تحويل (undefined = يكفي تسجيل الدخول).
export const statusPermission: Partial<Record<RequestStatus, Permission>> = {
  approved: "approve_request",
  rejected: "reject_request",
  postponed: "postpone_request",
  checked_out: "security_check_out",
  in_diagnosis: "diagnose_patient",
  prescribed: "create_prescription",
  dispensed: "dispense_prescription",
  returned: "security_check_in",
  monthly_approved: "recommend_monthly_treatment",
  monthly_rejected: "recommend_monthly_treatment",
  monthly_modified: "recommend_monthly_treatment",
  monthly_ready_pharmacy: "manage_monthly_treatment",
  monthly_dispensed: "dispense_monthly_treatment",
};

export const statusLabels: Record<RequestStatus, string> = {
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
