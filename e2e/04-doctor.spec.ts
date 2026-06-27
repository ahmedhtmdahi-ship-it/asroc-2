import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Doctor Workstation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "doctor");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_500); // wait for lazy chunks
  });

  test("doctor page renders all stat cards", async ({ page }) => {
    await expect(page.locator("text=قائمة الكشف").first()).toBeVisible();
    await expect(page.locator("text=العلاج الشهري").first()).toBeVisible();
    await expect(page.locator("text=تم فحصهم اليوم").first()).toBeVisible();
    await expect(page.locator("text=وصفات محررة").first()).toBeVisible();
  });

  test("checkup queue section is visible", async ({ page }) => {
    await expect(page.locator("text=قائمة انتظار الكشف الطبي")).toBeVisible();
  });

  test("monthly treatment queue section is visible", async ({ page }) => {
    await expect(page.locator("text=طلبات العلاج الشهري").first()).toBeVisible();
  });

  test("search input is functional", async ({ page }) => {
    const search = page.locator('input[placeholder*="بحث"]').first();
    await expect(search).toBeVisible();
    await search.fill("محمد");
    await page.waitForTimeout(300);
    await search.clear();
  });

  test("diagnosis page loads when starting checkup", async ({ page }) => {
    await page.waitForTimeout(1_000);

    const startBtn = page.locator('button:has-text("بدء الكشف")').first();
    const hasPending = await startBtn.isVisible();

    if (hasPending) {
      await startBtn.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1_000);

      expect(page.url()).toContain("/doctor/diagnosis/");
      await expect(page.locator("text=محطة الكشف الطبي")).toBeVisible();
      await expect(page.locator("text=بيانات المريض")).toBeVisible();
      await expect(page.locator("text=الروشتة الطبية")).toBeVisible();
    } else {
      // No patients in queue — expected in clean test environment
      await expect(page.locator("text=لا توجد طلبات جاهزة")).toBeVisible();
    }
  });
});
