import { type Page, expect } from "@playwright/test";

export interface TestUser {
  username: string;
  password: string;
  newPassword: string;
  role: string;
  name: string;
}

// كل الحسابات هنا من api/prisma/seed-data/test-users.json (تُزرع خارج الإنتاج فقط).
// ملف users.json الحقيقي بقى بلا باسوردات نهائيًا بعد تنظيف الـ PII —
// الباسوردات الحقيقية عشوائية وبتتكتب في api/prisma/seed-output/seed-passwords.csv.
export const TEST_USERS: Record<string, TestUser> = {
  super_admin: {
    username: "test-admin",
    password: "Test@1234",
    newPassword: "Admin@2025!",
    role: "super_admin",
    name: "مدير نظام اختبار",
  },
  employee: {
    username: "test-employee",
    password: "Test@1234",
    newPassword: "Employee@2025!",
    role: "employee",
    name: "موظف اختبار",
  },
  // مدير قسم "التقطير" — نفس قسم test-employee عشان فلو الموافقة
  // يكون واقعيًا (المدير يشوف طلبات قسمه فقط — فصل الإدارات).
  manager: {
    username: "test-manager",
    password: "Test@1234",
    newPassword: "Manager@2025!",
    role: "manager",
    name: "مدير اختبار",
  },
  security: {
    username: "test-security",
    password: "Test@1234",
    newPassword: "Security@2025!",
    role: "security",
    name: "فرد أمن اختبار",
  },
  medical_admin: {
    username: "test-medical-admin",
    password: "Test@1234",
    newPassword: "MedAdmin@2025!",
    role: "medical_admin",
    name: "إداري طبي اختبار",
  },
  doctor: {
    username: "test-doctor",
    password: "Test@1234",
    newPassword: "Doctor@2025!",
    role: "doctor",
    name: "طبيب اختبار",
  },
  pharmacy: {
    username: "test-pharmacy",
    password: "Test@1234",
    newPassword: "Pharmacy@2025!",
    role: "pharmacy",
    name: "صيدلي اختبار",
  },
  office_manager: {
    username: "test-office-mgr",
    password: "Test@1234",
    newPassword: "OfficeMgr@2025!",
    role: "office_manager",
    name: "مدير مكتب اختبار",
  },
  pension_admin: {
    username: "test-pension",
    password: "Test@1234",
    newPassword: "Pension@2025!",
    role: "pension_admin",
    name: "مشرف معاشات اختبار",
  },
  // حسابات mustChangePassword=true مخصوصة لتيستات فلو تغيير الباسورد الإجباري.
  // force_change مبيتغيّرش باسورده أبدًا (تيستات الـ validation)، force_change_success بيتغيّر.
  force_change: {
    username: "test-force-change",
    password: "Test@1234",
    newPassword: "ForceChange@2025!",
    role: "employee",
    name: "موظف تغيير باسورد",
  },
  force_change_success: {
    username: "test-force-success",
    password: "Test@1234",
    newPassword: "ForceSuccess@2025!",
    role: "employee",
    name: "موظف تغيير باسورد ناجح",
  },
};

// صفحة الهبوط بعد الدخول حسب الدور — مطابقة لـ getRedirectPathByRole في AuthContext.
export const HOME_PATH: Record<string, string> = {
  super_admin: "/dashboard",
  manager: "/dashboard",
  office_manager: "/dashboard",
  employee: "/employee",
  doctor: "/doctor",
  pharmacy: "/pharmacy",
  security: "/security",
  medical_admin: "/medical-admin",
  pension_admin: "/pension-admin",
  force_change: "/employee",
  force_change_success: "/employee",
};

// أي صفحة هبوط صالحة بعد الدخول (أو change-password للمطالبين بتغييره).
const POST_LOGIN_URL =
  /\/(change-password|dashboard|employee|doctor|pharmacy|security|medical-admin|pension-admin)/;

/**
 * Log in with username and password. Handles the mustChangePassword redirect:
 * if the user is forced to change password, it fills the change-password form
 * and sets a new password, then lands on the role's home page.
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
    page.waitForURL(POST_LOGIN_URL).then(() => "navigated" as const),
    page.getByText("اسم المستخدم أو كلمة المرور غير صحيحة").waitFor({ timeout: 5000 }).then(() => "error" as const).catch(() => null),
  ]);

  if (errorOrNav === "error" || page.url().endsWith("/")) {
    usedPassword = user.newPassword;
    await page.fill("#username", user.username);
    await page.fill("#password", user.newPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(POST_LOGIN_URL);
  }

  if (page.url().includes("/change-password") && !opts.skipPasswordChange) {
    await page.fill("#currentPassword", usedPassword);
    await page.fill("#newPassword", user.newPassword);
    await page.fill("#confirmPassword", user.newPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(`**${HOME_PATH[role] ?? "/dashboard"}`, { timeout: 15000 });
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
  await page.waitForURL(`**${HOME_PATH[role] ?? "/dashboard"}`);
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
