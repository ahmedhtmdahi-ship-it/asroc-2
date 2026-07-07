import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Pension Admin - Page Access", () => {
  test("pension admin can access pension-admin page", async ({ page }) => {
    await loginAs(page, "pension_admin");
    await page.goto("/pension-admin");
    await expect(page).toHaveURL(/\/pension-admin/);
  });

  test("medical admin can access pension-admin page", async ({ page }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/pension-admin");
    await expect(page).toHaveURL(/\/pension-admin/);
  });

  test("employee cannot access pension-admin page", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/pension-admin");
    await expect(page).not.toHaveURL(/\/pension-admin/);
  });
});

test.describe("Pension Admin - Page Content", () => {
  test("shows pension admin page content", async ({ page }) => {
    await loginAs(page, "pension_admin");
    await page.goto("/pension-admin");
    await page.waitForTimeout(2000);

    const content = page.locator("main");
    await expect(content).toBeVisible();
  });
});

test.describe("Pension Admin - External Pharmacy Access", () => {
  test("pension admin can access external pharmacy", async ({ page }) => {
    await loginAs(page, "pension_admin");
    await page.goto("/pharmacy/external");
    await expect(page).toHaveURL(/\/pharmacy\/external/);
  });
});
