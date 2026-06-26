export type UserRole =
  | "employee"
  | "manager"
  | "office_manager"
  | "security"
  | "doctor"
  | "pharmacy"
  | "medical_admin"
  | "pension_admin"
  | "super_admin";

export type Permission =
  | "create_request"
  | "view_own_requests"
  | "view_medical_history"
  | "approve_request"
  | "reject_request"
  | "postpone_request"
  | "security_check_out"
  | "security_check_in"
  | "diagnose_patient"
  | "create_prescription"
  | "create_referral"
  | "create_sick_leave"
  | "recommend_monthly_treatment"
  | "dispense_prescription"
  | "manage_inventory"
  | "approve_referral"
  | "manage_monthly_treatment"
  | "manage_pensioners"
  | "manage_contracts"
  | "manage_pharmacy"
  | "manage_system"
  | "manage_referrals"
  | "dispense_regular_treatment"
  | "dispense_monthly_treatment"
  | "view_reports"
  | "print_documents"
  | "view_audit_log"
  | "all";

export interface User {
  id: string;
  username: string;
  password: string;
  financialNumber?: string;
  name: string;
  jobTitle?: string;
  workPlace?: string;
  department?: string;
  nationalId?: string;
  phone?: string;
  workType?: string;
  workShift?: "day" | "shift";
  clinic?: "medical_center" | "shift_clinic";
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
}
