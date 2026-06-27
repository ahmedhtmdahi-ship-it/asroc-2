import { describe, it, expect, vi } from "vitest";
import type { UserRole } from "@/app/types/user";

// AuthContext imports the Supabase client at module load. The client calls
// createClient() with env vars that don't exist in the test runtime, so we mock
// the module to keep these pure-function tests free of any network/SDK concerns.
vi.mock("@/app/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import {
  getRedirectPathByRole,
  getHomePathByRole,
  profileRowToUser,
} from "./AuthContext";

describe("getRedirectPathByRole", () => {
  const cases: Array<[UserRole, string]> = [
    ["employee", "/employee"],
    ["manager", "/manager/approvals"],
    ["office_manager", "/manager/approvals"],
    ["security", "/security"],
    ["doctor", "/doctor"],
    ["pharmacy", "/pharmacy"],
    ["medical_admin", "/medical-admin"],
    ["pension_admin", "/pension-admin"],
    ["super_admin", "/dashboard"],
  ];

  it.each(cases)("routes %s to %s", (role, expectedPath) => {
    expect(getRedirectPathByRole(role)).toBe(expectedPath);
  });

  it("routes manager and office_manager to the same approvals page", () => {
    expect(getRedirectPathByRole("manager")).toBe(
      getRedirectPathByRole("office_manager")
    );
  });

  it("falls back to /employee for an unknown role", () => {
    expect(getRedirectPathByRole("unknown" as UserRole)).toBe("/employee");
  });
});

describe("getHomePathByRole", () => {
  it("returns the login root when no role is provided", () => {
    expect(getHomePathByRole(undefined)).toBe("/");
    expect(getHomePathByRole()).toBe("/");
  });

  it("delegates to getRedirectPathByRole for a known role", () => {
    expect(getHomePathByRole("doctor")).toBe("/doctor");
    expect(getHomePathByRole("super_admin")).toBe("/dashboard");
  });
});

describe("profileRowToUser", () => {
  it("maps a fully-populated snake_case row to a camelCase User", () => {
    const row = {
      id: "USER-1",
      username: "50",
      financial_number: "50",
      name: "خالد عيد",
      job_title: "مدير عام مساعد",
      work_place: "التقطير",
      department: "التقطير",
      national_id: "26609102500132",
      phone: "01001412326",
      work_type: "ورادى",
      role: "employee",
      permissions: ["create_request", "view_own_requests"],
      is_active: true,
    };

    expect(profileRowToUser(row)).toEqual({
      id: "USER-1",
      username: "50",
      password: "",
      financialNumber: "50",
      name: "خالد عيد",
      jobTitle: "مدير عام مساعد",
      workPlace: "التقطير",
      department: "التقطير",
      nationalId: "26609102500132",
      phone: "01001412326",
      workType: "ورادى",
      role: "employee",
      permissions: ["create_request", "view_own_requests"],
      isActive: true,
    });
  });

  it("never exposes a password from the profile row", () => {
    const user = profileRowToUser({
      id: "x",
      username: "x",
      name: "x",
      role: "employee",
      // even if a stray password field shows up, it must be blanked out
      password: "should-be-ignored",
    });
    expect(user.password).toBe("");
  });

  it("defaults optional fields when they are missing", () => {
    const user = profileRowToUser({
      id: "USER-2",
      username: "admin",
      name: "مدير النظام",
      role: "super_admin",
    });

    expect(user.financialNumber).toBeUndefined();
    expect(user.jobTitle).toBeUndefined();
    expect(user.phone).toBeUndefined();
    expect(user.permissions).toEqual([]);
    expect(user.isActive).toBe(true);
  });

  it("treats a null is_active value as missing and defaults to active", () => {
    const user = profileRowToUser({
      id: "USER-3",
      username: "u",
      name: "n",
      role: "employee",
      is_active: null,
    });
    expect(user.isActive).toBe(true);
  });

  it("preserves an explicit inactive flag", () => {
    const user = profileRowToUser({
      id: "USER-4",
      username: "u",
      name: "n",
      role: "employee",
      is_active: false,
    });
    expect(user.isActive).toBe(false);
  });
});
