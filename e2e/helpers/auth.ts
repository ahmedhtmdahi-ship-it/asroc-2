import { type Page, expect } from "@playwright/test";

export interface TestUser {
  username: string;
  password: string;
  newPassword: string;
  role: string;
  name: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  super_admin: {
    username: "admin",
    password: "admin",
    newPassword: "Admin@2025!",
    role: "super_admin",
    name: "مدير النظام",
  },
  employee: {
    username: "50",
    password: "خالد 50",
    newPassword: "Employee@2025!",
    role: "employee",
    name: "خالد عيد فرغلى محمد",
  },
  manager: {
    username: "816",
    password: "إيناس 816",
    newPassword: "Manager@2025!",
    role: "manager",
    name: "إيناس على السيد فرغلى",
  },
  security: {
    username: "597",
    password: "صابر 597",
    newPassword: "Security@2025!",
    role: "security",
    name: "صابر محمود محمد حسين",
  },
  medical_admin: {
    username: "796",
    password: "عبدالهادى 796",
    newPassword: "MedAdmin@2025!",
    role: "medical_admin",
    name: "عبدالهادى كامل زيد سليمان",
  },
  doctor: {
    username: "test-doctor",
    password: "TestDoc123",
    newPassword: "Doctor@2025!",
    role: "doctor",
    name: "طبيب اختبار",
  },
  pharmacy: {
    username: "test-pharmacy",
    password: "TestPharm123",
    newPassword: "Pharmacy@2025!",
    role: "pharmacy",
    name: "صيدلي اختبار",
  },
  office_manager: {
    username: "test-office-mgr",
    password: "TestOffice123",
    newPassword: "OfficeMgr@2025!",
    role: "office_manager",
    name: "مدير مكتب اختبار",
  },
  pension_admin: {
    username: "test-pension",
    password: "TestPension123",
    newPassword: "Pension@2025!",
    role: "pension_admin",
    name: "مشرف معاشات اختبار",
  },
};

/**
 * Log in with username and password. Handles the mustChangePassword redirect:
 * if the user is forced to change password, it fills the change-password form
 * and sets a new password, then navigates to the dashboard.
 */
export async function loginAs(
  page: Page,
  role: keyof typeof TEST_USERS,
  opts: { skipPasswordChange?: boolean } = {},
) {
  const user = TEST_USERS[role];
  let usedPassword = user.password;

  await page.goto("/");
  await page.waitForSelector("#username");

  await page.fill("#username", user.username);
  await page.fill("#password", user.password);
  await page.click('button[type="submit"]');

  const errorOrNav = await Promise.race([
    page.waitForURL(/\/(change-password|dashboard)/).then(() => "navigated" as const),
    page.getByText("اسم المستخدم أو كلمة المرور غير صحيحة").waitFor({ timeout: 5000 }).then(() => "error" as const).catch(() => null),
  ]);

  if (errorOrNav === "error" || page.url().endsWith("/")) {
    usedPassword = user.newPassword;
    await page.fill("#username", user.username);
    await page.fill("#password", user.newPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(change-password|dashboard)/);
  }

  // Login navigates to /dashboard first; ProtectedRoute may then redirect
  // to /change-password if mustChangePassword is set. Wait for that redirect.
  if (page.url().includes("/dashboard")) {
    try {
      await page.waitForURL("**/change-password", { timeout: 2000 });
    } catch {
      // No redirect — user doesn't need to change password
    }
  }

  if (page.url().includes("/change-password") && !opts.skipPasswordChange) {
    await page.fill("#currentPassword", usedPassword);
    await page.fill("#newPassword", user.newPassword);
    await page.fill("#confirmPassword", user.newPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  }
}

/**
 * Log in using the new password (after password was already changed).
 */
export async function loginWithNewPassword(
  page: Page,
  role: keyof typeof TEST_USERS,
) {
  const user = TEST_USERS[role];

  await page.goto("/");
  await page.waitForSelector("#username");

  await page.fill("#username", user.username);
  await page.fill("#password", user.newPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
}

/**
 * Log out from the current session.
 */
export async function logout(page: Page) {
  // Look for logout button in sidebar or navigation
  const logoutBtn = page.getByText("تسجيل الخروج");
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
  } else {
    // Fallback: clear storage and navigate to login
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
  }
  await page.waitForURL("/");
}

/**
 * Wait for the API to be healthy before running tests.
 */
export async function waitForApi(page: Page) {
  await page.request.get("http://localhost:4000/health", {
    timeout: 15_000,
  });
}
