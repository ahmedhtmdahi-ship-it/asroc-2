import { createBrowserRouter } from "react-router";

import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";

import { LoginPage } from "./features/auth/pages/LoginPage";
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