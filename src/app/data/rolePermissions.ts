import type { Permission, UserRole } from "@/app/types/user";

export const rolePermissions = {
  "employee": [
    "create_request",
    "view_own_requests",
    "view_medical_history"
  ],
  "manager": [
    "approve_request",
    "reject_request",
    "postpone_request"
  ],
  "office_manager": [
    "approve_request",
    "reject_request",
    "postpone_request"
  ],
  "security": [
    "security_check_out",
    "security_check_in"
  ],
  "doctor": [
    "diagnose_patient",
    "create_prescription",
    "create_referral",
    "create_sick_leave",
    "recommend_monthly_treatment"
  ],
  "pharmacy": [
    "dispense_prescription",
    "manage_inventory",
    "manage_pharmacy"
  ],
  "medical_admin": [
    "approve_referral",
    "manage_referrals",
    "manage_monthly_treatment",
    "manage_pensioners",
    "manage_contracts",
    "manage_pharmacy",
    "manage_system",
    "view_reports",
    "print_documents",
    "view_audit_log",
    "dispense_regular_treatment",
    "dispense_monthly_treatment"
  ],
  "pension_admin": [
    "manage_pensioners",
    "manage_monthly_treatment"
  ],
  "super_admin": [
    "all"
  ]
} satisfies Record<UserRole, Permission[]>;
