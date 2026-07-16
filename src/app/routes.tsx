import { createBrowserRouter } from "react-router";

import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";

import { LoginPage } from "./features/auth/pages/LoginPage";
import { ChangePasswordPage } from "./features/auth/pages/ChangePasswordPage";
import { DashboardPage } from "./features/dashboard/pages/DashboardPage";
import { NotFound } from "./features/routing/pages/NotFound";

import { EmployeeDashboardPage } from "./features/dashboard/pages/EmployeeDashboardPage";
import { EmployeeRequestsPage } from "./features/requests/pages/CreateMedicalRequestPage";
import { MyMedicalRequestsPage } from "./features/requests/pages/MyMedicalRequestsPage";
import { MedicalHistoryPage } from "./features/clinical/pages/MedicalHistoryPage";
import { NotificationsPage } from "./features/notifications/pages/NotificationsPage";
import { ProfilePage } from "./features/profile/pages/ProfilePage";

import { RequestDetailsPage } from "./features/requests/pages/RequestDetailsPage";

import { ManagerApprovalsPage } from "./features/approvals/pages/ManagerApprovalsPage";

import { SecurityPage } from "./features/security/pages/SecurityPage";
import { SecurityCheckInOutPage } from "./features/security/pages/SecurityCheckInOutPage";

import { DoctorPage } from "./features/clinical/pages/DoctorPage";
import { DoctorDiagnosisPage } from "./features/clinical/pages/DoctorDiagnosisPage";
import { DoctorReferralPage } from "./features/clinical/pages/DoctorReferralPage";

import { PharmacyPage } from "./features/pharmacy/pages/PharmacyPage";
import PharmacyDispensePage from "./features/pharmacy/pages/PharmacyDispensePage";
import { ExternalPharmacyPage } from "./features/pharmacy/pages/ExternalPharmacyPage";

import { MonthlyTreatmentPage } from "./features/treatments/pages/MonthlyTreatmentPage";
import { MedicalAdminPage } from "./features/admin/pages/MedicalAdminPage";
import { PensionAdminPage } from "./features/admin/pages/PensionAdminPage";
import { SuperAdminPage } from "./features/admin/pages/SuperAdminPage";
import { ReportsPage } from "./features/reports/pages/ReportsPage";
import { PrintPage } from "./features/print/pages/PrintPage";

import type { UserRole } from "@/app/types/user";

// ✅ مصدر واحد — لو ضفت دور جديد تعدل هنا بس
const ALL_ROLES: UserRole[] = [
  "employee",
  "manager",
  "office_manager",
  "security",
  "doctor",
  "pharmacy",
  "medical_admin",
  "pension_admin",
  "super_admin",
];

// ✅ الأدوار اللي تقدر تشوف تفاصيل طلب
const CAN_VIEW_REQUEST: UserRole[] = [
  "employee",
  "manager",
  "office_manager",
  "security",
  "doctor",
  "pharmacy",
  "medical_admin",
  "pension_admin",  // ✅ كانت ناقصة
  "super_admin",
];

// ✅ الأدوار الإدارية (تقدر تشوف الداشبورد العامة)
const ADMIN_ROLES: UserRole[] = [
  "manager",
  "office_manager",
  "doctor",
  "pharmacy",
  "security",
  "medical_admin",
  "pension_admin",
  "super_admin",
];

export const router = createBrowserRouter([
  // ─── عام ───
  { path: "/", Component: LoginPage },

  {
    path: "/change-password",
    element: (
      <ProtectedRoute>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },

  // ─── لوحة التحكم العامة (الموظف يروح لـ /employee) ───
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute roles={ADMIN_ROLES}>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },

  // ─── لوحة الموظف ───
  {
    path: "/employee",
    element: (
      <ProtectedRoute roles={["employee"]}>
        <EmployeeDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/employee/requests",
    element: (
      <ProtectedRoute roles={["employee"]}>
        <EmployeeRequestsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/employee/history",
    element: (
      <ProtectedRoute roles={["employee"]}>
        <MedicalHistoryPage />
      </ProtectedRoute>
    ),
  },

  // ─── إشعارات — كل الأدوار ───
  {
    path: "/notifications",
    element: (
      <ProtectedRoute roles={ALL_ROLES}>
        <NotificationsPage />
      </ProtectedRoute>
    ),
  },

  // ─── طلباتي — كل الأدوار ───
  {
    path: "/my-requests",
    element: (
      <ProtectedRoute roles={ALL_ROLES}>
        <MyMedicalRequestsPage />
      </ProtectedRoute>
    ),
  },

  // ─── طلب جديد — كل الأدوار ───
  {
    path: "/request/new",
    element: (
      <ProtectedRoute roles={ALL_ROLES}>
        <EmployeeRequestsPage />
      </ProtectedRoute>
    ),
  },

  // ─── تفاصيل طلب ───
  {
    path: "/requests/:id",
    element: (
      <ProtectedRoute roles={CAN_VIEW_REQUEST}>
        <RequestDetailsPage />
      </ProtectedRoute>
    ),
  },

  // ─── الملف الشخصي — كل الأدوار ───
  {
    path: "/profile",
    element: (
      <ProtectedRoute roles={ALL_ROLES}>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },

  // ─── المدير ───
  {
    path: "/manager/approvals",
    element: (
      <ProtectedRoute roles={["manager", "office_manager"]}>
        <ManagerApprovalsPage />
      </ProtectedRoute>
    ),
  },

  // ─── الأمن ───
  {
    path: "/security",
    element: (
      <ProtectedRoute roles={["security"]}>
        <SecurityPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/security/checkinout",
    element: (
      <ProtectedRoute roles={["security"]}>
        <SecurityCheckInOutPage />
      </ProtectedRoute>
    ),
  },

  // ─── الطبيب ───
  {
    path: "/doctor",
    element: (
      <ProtectedRoute roles={["doctor"]}>
        <DoctorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/doctor/diagnosis/:id",
    element: (
      <ProtectedRoute roles={["doctor"]}>
        <DoctorDiagnosisPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/doctor/referral/:id",
    element: (
      <ProtectedRoute roles={["doctor"]}>
        <DoctorReferralPage />
      </ProtectedRoute>
    ),
  },

  // ─── الصيدلية ───
  {
    path: "/pharmacy",
    element: (
      <ProtectedRoute roles={["pharmacy", "medical_admin"]}>
        <PharmacyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/pharmacy/dispense/:id",
    element: (
      <ProtectedRoute roles={["pharmacy", "medical_admin"]}>
        <PharmacyDispensePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/pharmacy/external",
    element: (
      <ProtectedRoute roles={["pharmacy", "pension_admin", "medical_admin"]}>
        <ExternalPharmacyPage />
      </ProtectedRoute>
    ),
  },

  // ─── العلاج الشهري ───
  {
    path: "/monthly-treatment",
    element: (
      <ProtectedRoute roles={["medical_admin", "pension_admin"]}>
        <MonthlyTreatmentPage />
      </ProtectedRoute>
    ),
  },

  // ─── الإدارات ───
  {
    path: "/medical-admin",
    element: (
      <ProtectedRoute roles={["medical_admin"]}>
        <MedicalAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/pension-admin",
    element: (
      <ProtectedRoute roles={["pension_admin", "medical_admin"]}>
        <PensionAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/super-admin",
    element: (
      <ProtectedRoute roles={["super_admin"]}>
        <SuperAdminPage />
      </ProtectedRoute>
    ),
  },

  // ─── التقارير والطباعة ───
  {
    path: "/reports",
    element: (
      <ProtectedRoute roles={["manager", "office_manager", "medical_admin", "super_admin"]}>
        <ReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/print",
    element: (
      <ProtectedRoute roles={["manager", "office_manager", "medical_admin", "super_admin"]}>
        <PrintPage />
      </ProtectedRoute>
    ),
  },

  // ─── 404 ───
  { path: "*", Component: NotFound },
]);