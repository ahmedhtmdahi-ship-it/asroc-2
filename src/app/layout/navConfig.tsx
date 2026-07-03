import {
  Bell,
  BedDouble,
  ClipboardCheck,
  ClipboardList,
  FilePlus2,
  FileText,
  HeartPulse,
  Home,
  MapPin,
  Package,
  Pill,
  ScrollText,
  Shield,
  ShieldCheck,
  Stethoscope,
  UserCircle,
  Users,
} from "lucide-react";
import type { UserRole } from "@/app/types/user";

export type NavItem = {
  label: string;
  icon: any;
  to: string;
};

// عناصر مشتركة بين كل الأدوار
const home: NavItem = { label: "الرئيسية", icon: Home, to: "/dashboard" };
const newRequest: NavItem = { label: "طلب جديد", icon: FilePlus2, to: "/request/new" };
const myRequests: NavItem = { label: "طلباتي", icon: ClipboardList, to: "/my-requests" };
const history: NavItem = { label: "التاريخ الطبي", icon: HeartPulse, to: "/employee/history" };
const notifications: NavItem = { label: "الإشعارات", icon: Bell, to: "/employee/notifications" };
const profile: NavItem = { label: "الملف الشخصي", icon: UserCircle, to: "/profile" };

const employeeBase: NavItem[] = [home, newRequest, myRequests, history, notifications, profile];

// زراير السايدبار لكل دور — المصدر الوحيد للحقيقة
export const navConfig: Record<UserRole, NavItem[]> = {
  employee: employeeBase,

  manager: [
    home,
    { label: "موافقات المدير", icon: ClipboardCheck, to: "/manager/approvals" },
    newRequest,
    myRequests,
    history,
    notifications,
    profile,
  ],

  office_manager: [
    home,
    { label: "موافقات المدير", icon: ClipboardCheck, to: "/manager/approvals" },
    newRequest,
    myRequests,
    notifications,
    profile,
  ],

  doctor: [
    home,
    { label: "فحص الطبيب", icon: Stethoscope, to: "/doctor" },
    { label: "العلاج الشهري", icon: BedDouble, to: "/monthly-treatment" },
    newRequest,
    myRequests,
    notifications,
    profile,
  ],

  pharmacy: [
    home,
    { label: "قائمة الصيدلية", icon: Pill, to: "/pharmacy" },
    { label: "الصيدلية الخارجية", icon: Package, to: "/pharmacy/external" },
    { label: "المخزون والتشغيلات", icon: Package, to: "/pharmacy/batches" },
    notifications,
    profile,
  ],

  security: [
    home,
    { label: "بوابة الأمن", icon: Shield, to: "/security" },
    { label: "تسجيل خروج/عودة", icon: ShieldCheck, to: "/security/checkinout" },
    notifications,
    profile,
  ],

  medical_admin: [
    home,
    { label: "الإدارة الطبية", icon: FileText, to: "/medical-admin" },
    { label: "العلاج الشهري", icon: BedDouble, to: "/monthly-treatment" },
    { label: "التقارير", icon: ScrollText, to: "/reports" },
    notifications,
    profile,
  ],

  pension_admin: [
    home,
    { label: "إدارة المعاشات", icon: Users, to: "/pension-admin" },
    notifications,
    profile,
  ],

  // super_admin يشوف كل شيء
  super_admin: [
    home,
    { label: "لوحة الإدارة", icon: Users, to: "/super-admin" },
    { label: "موافقات المدير", icon: ClipboardCheck, to: "/manager/approvals" },
    { label: "بوابة الأمن", icon: Shield, to: "/security" },
    { label: "فحص الطبيب", icon: Stethoscope, to: "/doctor" },
    { label: "قائمة الصيدلية", icon: Pill, to: "/pharmacy" },
    { label: "الإدارة الطبية", icon: FileText, to: "/medical-admin" },
    { label: "إدارة المعاشات", icon: Users, to: "/pension-admin" },
    { label: "العلاج الشهري", icon: BedDouble, to: "/monthly-treatment" },
    { label: "مقدمو الخدمات", icon: MapPin, to: "/external-providers" },
    { label: "التقارير", icon: ScrollText, to: "/reports" },
    { label: "سجل العمليات", icon: ScrollText, to: "/admin/audit-log" },
    profile,
  ],
};
