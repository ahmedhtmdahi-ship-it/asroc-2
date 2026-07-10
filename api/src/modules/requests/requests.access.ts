import type { FastifyRequest } from "fastify";

import type { Permission, UserRole } from "@asroc/shared/roles.js";

// ✅ نوع صريح بدل any — هوية + صلاحيات + إدارة المستخدم
export interface RequestUser {
  sub: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  department: string | null;
}

/**
 * هوية المستخدم لاتخاذ قرار الصلاحية.
 * - الهوية (sub/name) من التوكن.
 * - الدور/الصلاحيات/الإدارة من نسخة الداتابيز الحيّة (req.authenticatedUser) —
 *   عشان تغيير الدور/الإدارة يسري فورًا من غير انتظار إعادة تسجيل الدخول.
 */
export function resolveUser(req: FastifyRequest): RequestUser {
  const token = req.user as { sub: string; name: string };
  const account = req.authenticatedUser;
  return {
    sub: token.sub,
    name: token.name,
    role: account?.role ?? (req.user.role as UserRole),
    permissions: account?.permissions ?? (req.user.permissions as Permission[]),
    department: account?.department ?? null,
  };
}

// ─── فصل الإدارات ────────────────────────────────────────────────────────
// الأدوار اللي بتشوف كل الإدارات (خدمات بتخدم كل المؤسسة): السوبر أدمن + الطبية
// + الأدوار التشغيلية (أمن/صيدلية/طبيب/معاشات). المدير مقيّد بإدارته، والموظف بطلباته.
export const CROSS_DEPARTMENT_ROLES: UserRole[] = [
  "super_admin",
  "medical_admin",
  "security",
  "pharmacy",
  "doctor",
  "pension_admin",
];

export const DEPARTMENT_SCOPED_ROLES: UserRole[] = ["manager", "office_manager"];

export function isFullViewer(user: RequestUser): boolean {
  if (user.permissions.includes("all")) return true;
  return CROSS_DEPARTMENT_ROLES.includes(user.role);
}

export function isDepartmentManager(user: RequestUser): boolean {
  return DEPARTMENT_SCOPED_ROLES.includes(user.role);
}

/** هل يحق للمستخدم الوصول لطلب بعينه (قراءة/كتابة)؟ */
export function canReachRequest(
  user: RequestUser,
  request: { employeeId: string; department: string },
): boolean {
  if (isFullViewer(user)) return true;
  if (request.employeeId === user.sub) return true; // طلبه هو
  if (isDepartmentManager(user) && !!user.department && request.department === user.department) {
    return true; // المدير في نفس إدارته فقط
  }
  return false;
}
