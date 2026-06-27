import { describe, it, expect } from "vitest";
import { rolePermissions } from "./rolePermissions";
import type { Permission, UserRole } from "@/app/types/user";

// The full set of roles and permissions declared by the type system. These are
// duplicated here on purpose: if someone adds a role/permission to the union but
// forgets to wire it into rolePermissions, the relevant test below fails.
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

const ALL_PERMISSIONS: Permission[] = [
  "create_request",
  "view_own_requests",
  "view_medical_history",
  "approve_request",
  "reject_request",
  "postpone_request",
  "security_check_out",
  "security_check_in",
  "diagnose_patient",
  "create_prescription",
  "create_referral",
  "create_sick_leave",
  "recommend_monthly_treatment",
  "dispense_prescription",
  "manage_inventory",
  "approve_referral",
  "manage_monthly_treatment",
  "manage_pensioners",
  "manage_contracts",
  "manage_pharmacy",
  "manage_system",
  "manage_referrals",
  "dispense_regular_treatment",
  "dispense_monthly_treatment",
  "view_reports",
  "print_documents",
  "view_audit_log",
  "all",
];

describe("rolePermissions", () => {
  it("defines a permission list for every role", () => {
    for (const role of ALL_ROLES) {
      expect(rolePermissions).toHaveProperty(role);
      expect(Array.isArray(rolePermissions[role])).toBe(true);
    }
  });

  it("does not declare any unknown roles", () => {
    for (const role of Object.keys(rolePermissions)) {
      expect(ALL_ROLES).toContain(role);
    }
  });

  it("only references valid permission values", () => {
    for (const role of ALL_ROLES) {
      for (const permission of rolePermissions[role]) {
        expect(ALL_PERMISSIONS).toContain(permission);
      }
    }
  });

  it("gives super_admin the wildcard permission and nothing else", () => {
    expect(rolePermissions.super_admin).toEqual(["all"]);
  });

  it("does not grant the wildcard 'all' permission to non super_admin roles", () => {
    for (const role of ALL_ROLES) {
      if (role === "super_admin") continue;
      expect(rolePermissions[role]).not.toContain("all");
    }
  });

  it("has no duplicate permissions within a single role", () => {
    for (const role of ALL_ROLES) {
      const perms = rolePermissions[role];
      expect(new Set(perms).size).toBe(perms.length);
    }
  });

  it("grants the employee the core self-service request permissions", () => {
    expect(rolePermissions.employee).toEqual(
      expect.arrayContaining([
        "create_request",
        "view_own_requests",
        "view_medical_history",
      ])
    );
  });

  it("grants approver roles identical approval permissions", () => {
    expect(rolePermissions.manager).toEqual(rolePermissions.office_manager);
    expect(rolePermissions.manager).toEqual(
      expect.arrayContaining(["approve_request", "reject_request", "postpone_request"])
    );
  });

  it("lets the doctor diagnose and prescribe but not dispense", () => {
    expect(rolePermissions.doctor).toContain("diagnose_patient");
    expect(rolePermissions.doctor).toContain("create_prescription");
    expect(rolePermissions.doctor).not.toContain("dispense_prescription");
  });

  it("lets the pharmacy dispense but not diagnose", () => {
    expect(rolePermissions.pharmacy).toContain("dispense_prescription");
    expect(rolePermissions.pharmacy).not.toContain("diagnose_patient");
  });
});
