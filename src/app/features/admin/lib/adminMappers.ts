import type { ApiUser } from "@/app/lib/dataApi";
import type { Permission, User, UserRole } from "@/app/types/user";

// تحويل مستخدم الـ API لنموذج الواجهة (بدون أي password).
export function apiUserToUser(u: ApiUser): User {
  return {
    id:              u.id,
    name:            u.name,
    username:        u.username,
    financialNumber: u.financialNumber ?? undefined,
    jobTitle:        u.jobTitle ?? undefined,
    workPlace:       u.workPlace ?? undefined,
    department:      u.department ?? undefined,
    nationalId:      u.nationalId ?? undefined,
    phone:           u.phone ?? undefined,
    workType:        u.workType ?? undefined,
    role:            u.role as UserRole,
    permissions:     u.permissions as Permission[],
    isActive:        u.isActive,
  };
}

// ─── Role & Permission Labels ────────────────────────────────────────
export const roleLabels: Record<UserRole, string> = {
  employee: "موظف",
  manager: "مدير/مكلف",
  office_manager: "مدير مكتب",
  security: "أمن",
  doctor: "طبيب",
  pharmacy: "صيدلية",
  medical_admin: "إدارة طبية",
  pension_admin: "إدارة معاشات",
  super_admin: "مشرف نظام",
};

export const permissionLabels: Record<Permission, string> = {
  create_request: "إنشاء طلب",
  view_own_requests: "عرض طلباتي",
  view_medical_history: "عرض التاريخ الطبي",
  approve_request: "اعتماد الطلبات",
  reject_request: "رفض الطلبات",
  postpone_request: "تأجيل الطلبات",
  security_check_out: "تسجيل خروج الأمن",
  security_check_in: "تسجيل عودة الأمن",
  diagnose_patient: "تشخيص المريض",
  create_prescription: "كتابة روشتة",
  create_referral: "إنشاء تحويل",
  create_sick_leave: "إجازة مرضية",
  recommend_monthly_treatment: "توصية علاج شهري",
  dispense_prescription: "صرف روشتة",
  manage_inventory: "إدارة المخزون",
  approve_referral: "اعتماد تحويل",
  manage_monthly_treatment: "إدارة علاج شهري",
  manage_pensioners: "إدارة معاشات",
  manage_contracts: "إدارة تعاقدات",
  manage_pharmacy: "إدارة صيدلية",
  manage_system: "إدارة النظام",
  manage_referrals: "إدارة التحويلات",
  dispense_regular_treatment: "صرف علاج عادي",
  dispense_monthly_treatment: "صرف علاج شهري",
  view_reports: "عرض التقارير",
  print_documents: "طباعة مستندات",
  view_audit_log: "سجل العمليات",
  all: "كل الصلاحيات",
};

export function roleLabel(role: UserRole) {
  return roleLabels[role] || role;
}

export function permissionLabel(permission: Permission) {
  return permissionLabels[permission] || permission;
}
