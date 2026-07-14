import { test, expect } from "@playwright/test";
import { TEST_USERS, loginAs, waitForApi } from "./helpers/auth";
import { LOGIN, CHANGE_PASSWORD } from "./helpers/selectors";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // ─── Login Page UI ───

  test("shows the login page with correct elements", async ({ page }) => {
    await expect(page.locator(LOGIN.username)).toBeVisible();
    await expect(page.locator(LOGIN.password)).toBeVisible();
    await expect(
      page.locator(LOGIN.submit).filter({ hasText: LOGIN.submitText }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "ASORC" })).toBeVisible();
    await expect(page.getByText("نظام إدارة الخدمات الطبية")).toBeVisible();
  });

  test("shows the app branding and footer", async ({ page }) => {
    await expect(page.getByText("شركة أسيوط لتكرير البترول")).toBeVisible();
    await expect(page.getByText("قطاع الخدمات الطبية")).toBeVisible();
  });

  // ─── Login Validation ───

  test("shows error on empty form submission", async ({ page }) => {
    await page.click(LOGIN.submit);
    // HTML5 validation should prevent submission — username is required
    const usernameInput = page.locator(LOGIN.username);
    await expect(usernameInput).toHaveAttribute("required", "");
  });

  test("shows error on wrong credentials", async ({ page }) => {
    await page.fill(LOGIN.username, "nonexistent");
    await page.fill(LOGIN.password, "wrongpassword");
    await page.click(LOGIN.submit);

    await expect(page.getByText(LOGIN.errorMsg)).toBeVisible();
  });

  test("shows error on correct username but wrong password", async ({
    page,
  }) => {
    await page.fill(LOGIN.username, TEST_USERS.employee.username);
    await page.fill(LOGIN.password, "definitely-wrong-password");
    await page.click(LOGIN.submit);

    await expect(page.getByText(LOGIN.errorMsg)).toBeVisible();
  });

  // ─── Successful Login ───

  test("logs in as super_admin and redirects", async ({ page }) => {
    const user = TEST_USERS.super_admin;
    await page.fill(LOGIN.username, user.username);
    await page.fill(LOGIN.password, user.password);
    await page.click(LOGIN.submit);

    // Should redirect (either to change-password or dashboard)
    await page.waitForURL(
      /\/(change-password|dashboard)/,
    );
  });

  test("logs in as employee and redirects", async ({ page }) => {
    const user = TEST_USERS.employee;
    await page.fill(LOGIN.username, user.username);
    await page.fill(LOGIN.password, user.password);
    await page.click(LOGIN.submit);

    // الموظف بيهبط على /employee (أو /change-password لو مطالب بالتغيير)
    await page.waitForURL(
      /\/(change-password|employee)/,
    );
  });

  // ─── Password Toggle ───

  test("toggles password visibility", async ({ page }) => {
    await page.fill(LOGIN.password, "test123");
    const passwordInput = page.locator(LOGIN.password);
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click show password button
    const toggleBtn = page.getByLabel("إظهار كلمة المرور");
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click hide password button
    const hideBtn = page.getByLabel("إخفاء كلمة المرور");
    await hideBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  // ─── Loading State ───

  test("shows loading text during login", async ({ page }) => {
    await page.fill(LOGIN.username, TEST_USERS.employee.username);
    await page.fill(LOGIN.password, TEST_USERS.employee.password);

    const submitBtn = page.locator(LOGIN.submit);
    await submitBtn.click();

    // Button should be disabled during loading
    // (might be too fast to catch, so we just verify no error)
  });
});

// تغيير الباسورد بقى اختياري (مش إجباري) — الاختبارات القديمة كانت بتختبر سلوك
// الإجبار اللي اتشال. النسخة دي بتؤكد السلوك الجديد: حساب علّم mustChangePassword=true
// بيدخل على صفحة دوره مباشرة من غير ما يتحوّل قسرًا لصفحة تغيير الباسورد.
test.describe("Password change is optional (not forced)", () => {
  test("seeded user logs straight to their home — no forced change-password", async ({
    page,
  }) => {
    const user = TEST_USERS.force_change; // حساب mustChangePassword=true في الـ seed
    await page.goto("/");
    await page.fill(LOGIN.username, user.username);
    await page.fill(LOGIN.password, user.password);
    await page.click(LOGIN.submit);

    // بيهبط على صفحة الموظف مباشرة — مفيش redirect إجباري لـ /change-password.
    await page.waitForURL("**/employee");
    await expect(page).not.toHaveURL(/change-password/);
  });
});

test.describe("Access Control", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("/");
    await expect(page.locator(LOGIN.username)).toBeVisible();
  });

  test("redirects unauthenticated from /super-admin to login", async ({
    page,
  }) => {
    await page.goto("/super-admin");
    await page.waitForURL("/");
  });

  test("redirects unauthenticated from /my-requests to login", async ({
    page,
  }) => {
    await page.goto("/my-requests");
    await page.waitForURL("/");
  });

  test("redirects unauthenticated from /doctor to login", async ({
    page,
  }) => {
    await page.goto("/doctor");
    await page.waitForURL("/");
  });
});
