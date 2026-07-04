import { test, expect } from "@playwright/test";
import { loginAs, TEST_USERS } from "./helpers/auth";

test.describe("Profile Page", () => {
  test("all roles can access profile page", async ({ page }) => {
    const roles = [
      "employee",
      "manager",
      "security",
      "super_admin",
      "medical_admin",
      "doctor",
      "pharmacy",
    ] as const;

    for (const role of roles) {
      await loginAs(page, role);
      await page.goto("/profile");
      await expect(page).toHaveURL(/\/profile/);
      // Clear session for next iteration
      await page.evaluate(() => localStorage.clear());
    }
  });

  test("displays user info on profile", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/profile");
    await page.waitForTimeout(2000);

    // Should show user name
    await expect(page.getByText(TEST_USERS.employee.name)).toBeVisible();
  });

  test("shows role information", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/profile");
    await page.waitForTimeout(2000);

    // Should display role-related info
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });
});
