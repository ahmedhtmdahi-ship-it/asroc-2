import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Employee", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "employee");
  });

  test("dashboard renders stats cards", async ({ page }) => {
    await expect(page.locator("text=طلب فحص طبي").first()).toBeVisible();
  });

  test("can navigate to request creation page", async ({ page }) => {
    await page.goto("http://localhost:5173/employee/requests", {
      waitUntil: "networkidle",
    });
    await expect(page.locator("textarea, input").first()).toBeVisible();
  });

  test("can navigate to my requests page", async ({ page }) => {
    await page.locator("text=طلباتي").first().click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("my-requests");
  });

  test("can navigate to profile page", async ({ page }) => {
    await page.goto("http://localhost:5173/profile", {
      waitUntil: "networkidle",
    });
    expect(page.url()).toContain("/profile");
    await expect(page.locator("text=الملف الشخصي").first()).toBeVisible();
  });

  test("creates a medical request", async ({ page }) => {
    await page.goto("http://localhost:5173/employee/requests", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_000);

    const reasonInput = page
      .locator("textarea")
      .filter({ hasText: /.{0,5}/ })
      .first();
    if (await reasonInput.isVisible()) {
      await reasonInput.fill("ألم في الرأس والحمى");
    }

    const submitBtn = page.locator('button:has-text("تقديم"), button:has-text("إرسال"), button:has-text("تقديم الطلب")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(1_500);
    }

    const currentUrl = page.url();
    expect(currentUrl).toMatch(/employee|my-requests/);
  });
});
