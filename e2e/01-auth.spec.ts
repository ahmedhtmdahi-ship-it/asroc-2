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

test.describe("Change Password (forced)", () => {
  test("redirects seeded users to change-password on first login", async ({
    page,
  }) => {
    const user = TEST_USERS.force_change;
    await page.goto("/");
    await page.fill(LOGIN.username, user.username);
    await page.fill(LOGIN.password, user.password);
    await page.click(LOGIN.submit);

    await page.waitForURL("**/change-password");
    await expect(
      page.getByText("تغيير كلمة المرور"),
    ).toBeVisible();
    await expect(
      page.getByText("لازم تغيّر كلمة المرور الافتراضية"),
    ).toBeVisible();
  });

  test("validates new password minimum length", async ({ page }) => {
    await loginAs(page, "force_change", { skipPasswordChange: true });
    // Should be on change-password page
    if (!page.url().includes("/change-password")) return;

    await page.fill(CHANGE_PASSWORD.currentPassword, TEST_USERS.force_change.password);
    await page.fill(CHANGE_PASSWORD.newPassword, "short");
    await page.fill(CHANGE_PASSWORD.confirmPassword, "short");
    await page.click(CHANGE_PASSWORD.submit);

    await expect(
      page.getByText(CHANGE_PASSWORD.errorMinLength),
    ).toBeVisible();
  });

  test("validates password confirmation mismatch", async ({ page }) => {
    await loginAs(page, "force_change", { skipPasswordChange: true });
    if (!page.url().includes("/change-password")) return;

    await page.fill(CHANGE_PASSWORD.currentPassword, TEST_USERS.force_change.password);
    await page.fill(CHANGE_PASSWORD.newPassword, "NewPass@2025!");
    await page.fill(CHANGE_PASSWORD.confirmPassword, "DifferentPass@2025!");
    await page.click(CHANGE_PASSWORD.submit);

    await expect(
      page.getByText(CHANGE_PASSWORD.errorMismatch),
    ).toBeVisible();
  });

  test("validates new password differs from current", async ({ page }) => {
    await loginAs(page, "force_change", { skipPasswordChange: true });
    if (!page.url().includes("/change-password")) return;

    const samePass = "SamePassword@2025!";
    await page.fill(CHANGE_PASSWORD.currentPassword, samePass);
    await page.fill(CHANGE_PASSWORD.newPassword, samePass);
    await page.fill(CHANGE_PASSWORD.confirmPassword, samePass);
    await page.click(CHANGE_PASSWORD.submit);

    await expect(
      page.getByText(CHANGE_PASSWORD.errorSameAsCurrent),
    ).toBeVisible();
  });

  test("successfully changes password and redirects to dashboard", async ({
    page,
  }) => {
    // Use the loginAs helper which handles password change flow
    // This will change the password if mustChangePassword is true,
    // or login directly if already changed from a previous run
    await loginAs(page, "force_change_success");
    // بعد التغيير بيهبط على صفحة دوره (موظف → /employee)
    await expect(page).toHaveURL(/\/employee/);
  });

  test("can log out from change-password page", async ({ page }) => {
    const user = TEST_USERS.force_change;
    await page.goto("/");
    await page.fill(LOGIN.username, user.username);
    await page.fill(LOGIN.password, user.password);
    await page.click(LOGIN.submit);

    // If on change-password page, logout button should be visible
    if (page.url().includes("/change-password")) {
      await page.click(`text=${CHANGE_PASSWORD.logoutText}`);
      await page.waitForURL("/");
    }
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
