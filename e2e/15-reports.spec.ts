import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Reports Page", () => {
  test("medical admin can access reports page", async ({ page }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/reports/);
  });

  test("super admin can access reports page", async ({ page }) => {
    await loginAs(page, "super_admin");
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/reports/);
  });

  test("employee cannot access reports page", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/reports");
    await expect(page).not.toHaveURL(/\/reports/);
  });

  test("reports page shows content", async ({ page }) => {
    await loginAs(page, "super_admin");
    await page.goto("/reports");
    await page.waitForTimeout(2000);

    const content = page.locator("main");
    await expect(content).toBeVisible();
  });
});

test.describe("Print Page", () => {
  test("medical admin can access print page", async ({ page }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/print");
    await expect(page).toHaveURL(/\/print/);
  });

  test("super admin can access print page", async ({ page }) => {
    await loginAs(page, "super_admin");
    await page.goto("/print");
    await expect(page).toHaveURL(/\/print/);
  });

  test("employee cannot access print page", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/print");
    await expect(page).not.toHaveURL(/\/print/);
  });
});
