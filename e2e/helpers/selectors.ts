/**
 * Centralized selectors and Arabic UI text constants for the ASROC app.
 */

// ── Login Page ──
export const LOGIN = {
  username: "#username",
  password: "#password",
  submit: 'button[type="submit"]',
  errorMsg: "اسم المستخدم أو كلمة المرور غير صحيحة",
  submitText: "تسجيل الدخول",
  loadingText: "جاري تسجيل الدخول...",
};

// ── Change Password Page ──
export const CHANGE_PASSWORD = {
  currentPassword: "#currentPassword",
  newPassword: "#newPassword",
  confirmPassword: "#confirmPassword",
  submit: 'button[type="submit"]',
  submitText: "حفظ كلمة المرور",
  logoutText: "تسجيل الخروج",
  errorMinLength: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل",
  errorMismatch: "كلمة المرور الجديدة وتأكيدها غير متطابقين",
  errorSameAsCurrent: "كلمة المرور الجديدة يجب أن تختلف عن الحالية",
};

// ── Dashboard ──
export const DASHBOARD = {
  title: "لوحة التحكم",
};

// ── Sidebar Navigation ──
export const NAV = {
  dashboard: "لوحة التحكم",
  newRequest: "طلب جديد",
  myRequests: "طلباتي",
  medicalHistory: "السجل الطبي",
  notifications: "الإشعارات",
  profile: "الملف الشخصي",
  managerApprovals: "موافقات المدير",
  security: "الأمن",
  doctor: "الطبيب",
  pharmacy: "الصيدلية",
  monthlyTreatment: "العلاج الشهري",
  medicalAdmin: "الإدارة الطبية",
  pensionAdmin: "شئون المعاشات",
  superAdmin: "إدارة النظام",
  reports: "التقارير",
  logout: "تسجيل الخروج",
};

// ── Request Creation Form ──
export const REQUEST_FORM = {
  reason: "سبب الطلب",
  serviceCheckup: "كشف طبي",
  serviceMonthly: "علاج شهري",
  typeNormal: "عادي",
  typeEmergency: "طوارئ",
  submitText: "إرسال الطلب",
};

// ── Manager Approvals ──
export const MANAGER = {
  approve: "موافقة",
  reject: "رفض",
  postpone: "تأجيل",
  decisionReason: "سبب القرار",
};

// ── Security ──
export const SECURITY = {
  checkOut: "تسجيل خروج",
  checkIn: "تسجيل دخول",
};

// ── Doctor ──
export const DOCTOR = {
  startDiagnosis: "بدء الكشف",
  diagnosis: "التشخيص",
  prescription: "الوصفة",
  referral: "التحويل",
  sickLeave: "إجازة مرضية",
  saveDiagnosis: "حفظ التشخيص",
};

// ── Pharmacy ──
export const PHARMACY = {
  dispense: "صرف",
  inventory: "المخزن",
};

// ── Super Admin ──
export const SUPER_ADMIN = {
  users: "المستخدمون",
  addUser: "إضافة مستخدم",
  editUser: "تعديل",
  deleteUser: "حذف",
  activate: "تفعيل",
  deactivate: "تعطيل",
};

// ── data-testid ثابتة (بديل النصوص الهشّة في اختبارات المسار) ──
// مصدر واحد؛ المفهرسة بالـ id بتاخد request.id عشان نستهدف الطلب المحدّد.
export const tid = {
  requestReason: "request-reason",
  requestSubmit: "request-submit",
  typeNormal: "type-normal",
  typeEmergency: "type-emergency",

  myreqId: (id: string) => `myreq-id-${id}`,
  myreqStatus: (id: string) => `myreq-status-${id}`,
  myreqRow: (id: string) => `myreq-row-${id}`,

  approvalRequest: (id: string) => `approval-request-${id}`,
  approveBtn: "approve-btn",
  rejectBtn: "reject-btn",
  confirmDecision: "confirm-decision",

  checkout: (id: string) => `checkout-${id}`,
  checkinComplete: (id: string) => `checkin-complete-${id}`,

  startDiagnosis: (id: string) => `start-diagnosis-${id}`,
  diagnosisInput: "diagnosis-input",
  medicineCombobox: "medicine-combobox",
  savePrescription: "save-prescription",

  dispense: (id: string) => `dispense-${id}`,
  confirmReview: "confirm-review",
  confirmDispense: "confirm-dispense",
} as const;

// نصوص حالات الطلب (من packages/shared/src/workflow.ts) — للتأكيد على الحالة.
export const statusText = {
  pending: "بانتظار موافقة المدير",
  approved: "تمت الموافقة",
  completed: "مكتمل",
} as const;
