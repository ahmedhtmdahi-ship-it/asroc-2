import { lazy } from "react";
import { createBrowserRouter } from "react-router";

import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";

// Eager — critical path (first paint)
import { LoginPage } from "./features/auth/pages/LoginPage";
import { NotFound } from "./features/routing/pages/NotFound";

// Lazy — each role only loads its own pages
const DashboardPage           = lazy(() => import("./features/dashboard/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const EmployeeDashboardPage   = lazy(() => import("./features/dashboard/pages/EmployeeDashboardPage").then(m => ({ default: m.EmployeeDashboardPage })));
const EmployeeRequestsPage    = lazy(() => import("./features/requests/pages/CreateMedicalRequestPage").then(m => ({ default: m.EmployeeRequestsPage })));
const MyMedicalRequestsPage   = lazy(() => import("./features/requests/pages/MyMedicalRequestsPage").then(m => ({ default: m.MyMedicalRequestsPage })));
const MedicalHistoryPage      = lazy(() => import("./features/clinical/pages/MedicalHistoryPage").then(m => ({ default: m.MedicalHistoryPage })));
const NotificationsPage       = lazy(() => import("./features/notifications/pages/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const ProfilePage             = lazy(() => import("./features/profile/pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const RequestDetailsPage      = lazy(() => import("./features/requests/pages/RequestDetailsPage").then(m => ({ default: m.RequestDetailsPage })));
const ManagerApprovalsPage    = lazy(() => import("./features/approvals/pages/ManagerApprovalsPage").then(m => ({ default: m.ManagerApprovalsPage })));
const SecurityPage            = lazy(() => import("./features/security/pages/SecurityPage").then(m => ({ default: m.SecurityPage })));
const SecurityCheckInOutPage  = lazy(() => import("./features/security/pages/SecurityCheckInOutPage").then(m => ({ default: m.SecurityCheckInOutPage })));
const DoctorPage              = lazy(() => import("./features/clinical/pages/DoctorPage").then(m => ({ default: m.DoctorPage })));
const DoctorDiagnosisPage     = lazy(() => import("./features/clinical/pages/DoctorDiagnosisPage").then(m => ({ default: m.DoctorDiagnosisPage })));
const DoctorReferralPage      = lazy(() => import("./features/clinical/pages/DoctorReferralPage").then(m => ({ default: m.DoctorReferralPage })));
const PharmacyPage            = lazy(() => import("./features/pharmacy/pages/PharmacyPage").then(m => ({ default: m.PharmacyPage })));
const PharmacyDispensePage    = lazy(() => import("./features/pharmacy/pages/PharmacyDispensePage"));
const ExternalPharmacyPage    = lazy(() => import("./features/pharmacy/pages/ExternalPharmacyPage").then(m => ({ default: m.ExternalPharmacyPage })));
const MonthlyTreatmentPage    = lazy(() => import("./features/treatments/pages/MonthlyTreatmentPage").then(m => ({ default: m.MonthlyTreatmentPage })));
const MedicalAdminPage        = lazy(() => import("./features/admin/pages/MedicalAdminPage").then(m => ({ default: m.MedicalAdminPage })));
const PensionAdminPage        = lazy(() => import("./features/admin/pages/PensionAdminPage").then(m => ({ default: m.PensionAdminPage })));
const SuperAdminPage          = lazy(() => import("./features/admin/pages/SuperAdminPage").then(m => ({ default: m.SuperAdminPage })));
const ReportsPage             = lazy(() => import("./features/reports/pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const PrintPage               = lazy(() => import("./features/print/pages/PrintPage").then(m => ({ default: m.PrintPage })));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },

  {
    path: "/dashboard",
    element: (
      <ProtectedRoute roles={["super_admin"]}>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },

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

  // Universal my-requests — all roles can view their own submitted requests
  {
    path: "/my-requests",
    element: (
      <ProtectedRoute
        roles={[
          "employee",
          "manager",
          "office_manager",
          "security",
          "doctor",
          "pharmacy",
          "medical_admin",
          "pension_admin",
          "super_admin",
        ]}
      >
        <MyMedicalRequestsPage />
      </ProtectedRoute>
    ),
  },

  // Universal request creation — all authenticated roles can submit a request
  {
    path: "/request/new",
    element: (
      <ProtectedRoute
        roles={[
          "employee",
          "manager",
          "office_manager",
          "security",
          "doctor",
          "pharmacy",
          "medical_admin",
          "pension_admin",
          "super_admin",
        ]}
      >
        <EmployeeRequestsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/employee/my-requests",
    element: (
      <ProtectedRoute roles={["employee"]}>
        <MyMedicalRequestsPage />
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
  {
    path: "/employee/notifications",
    element: (
      <ProtectedRoute roles={["employee"]}>
        <NotificationsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute
        roles={[
          "employee",
          "manager",
          "office_manager",
          "security",
          "doctor",
          "pharmacy",
          "medical_admin",
          "pension_admin",
          "super_admin",
        ]}
      >
        <ProfilePage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/requests/:id",
    element: (
      <ProtectedRoute
        roles={[
          "employee",
          "manager",
          "office_manager",
          "security",
          "doctor",
          "pharmacy",
          "medical_admin",
          "super_admin",
        ]}
      >
        <RequestDetailsPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/manager/approvals",
    element: (
      <ProtectedRoute roles={["manager", "office_manager"]}>
        <ManagerApprovalsPage />
      </ProtectedRoute>
    ),
  },

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

  {
    path: "/pharmacy",
    element: (
      <ProtectedRoute roles={["pharmacy"]}>
        <PharmacyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/pharmacy/dispense/:id",
    element: (
      <ProtectedRoute roles={["pharmacy"]}>
        <PharmacyDispensePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/pharmacy/external",
    element: (
      <ProtectedRoute roles={["pharmacy", "pension_admin"]}>
        <ExternalPharmacyPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/monthly-treatment",
    element: (
      <ProtectedRoute roles={["medical_admin", "pension_admin"]}>
        <MonthlyTreatmentPage />
      </ProtectedRoute>
    ),
  },

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
      <ProtectedRoute roles={["pension_admin"]}>
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

  {
    path: "/reports",
    element: (
      <ProtectedRoute roles={["medical_admin", "super_admin"]}>
        <ReportsPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/print",
    element: (
      <ProtectedRoute roles={["medical_admin", "super_admin"]}>
        <PrintPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "*",
    Component: NotFound,
  },
]);
