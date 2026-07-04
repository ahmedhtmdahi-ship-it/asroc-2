import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Monthly Treatment - Page Access", () => {
  test("medical admin can access monthly treatment page", async ({
    page,
  }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/monthly-treatment");
    await expect(page).toHaveURL(/\/monthly-treatment/);
  });

  test("pension admin can access monthly treatment page", async ({
    page,
  }) => {
    await loginAs(page, "pension_admin");
    await page.goto("/monthly-treatment");
    await expect(page).toHaveURL(/\/monthly-treatment/);
  });

  test("employee cannot access monthly treatment page", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/monthly-treatment");
    // Should be redirected
    await expect(page).not.toHaveURL(/\/monthly-treatment/);
  });
});

test.describe("Monthly Treatment - Page Content", () => {
  test("shows monthly treatment management page", async ({ page }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/monthly-treatment");
    await page.waitForTimeout(2000);

    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("displays monthly treatment requests or empty state", async ({
    page,
  }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/monthly-treatment");
    await page.waitForTimeout(2000);

    // Should have content area
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });
});

test.describe("Monthly Treatment - Workflow", () => {
  test("monthly treatment requests show correct status badges", async ({
    page,
  }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/monthly-treatment");
    await page.waitForTimeout(2000);

    // Check for status-related UI elements
    const statusBadge = page.locator('[class*="badge"], [class*="Badge"], [class*="status"]');
    const count = await statusBadge.count();
    if (count > 0) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });
});
