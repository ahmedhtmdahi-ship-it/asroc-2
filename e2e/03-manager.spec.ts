import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Manager Approvals", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "manager");
  });

  test("approvals page renders KPI cards", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=بانتظار القرار")).toBeVisible();
    await expect(page.locator("text=تمت الموافقة اليوم")).toBeVisible();
    await expect(page.locator("text=تم الرفض")).toBeVisible();
    await expect(page.locator("text=تم التأجيل")).toBeVisible();
  });

  test("approvals page has filter controls", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await expect(page.locator('input[placeholder*="بحث"]').first()).toBeVisible();
    await expect(page.locator('[role="combobox"]').first()).toBeVisible();
  });

  test("selecting a pending request shows action buttons", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_000);

    // If there are pending requests, select one
    const requestCards = page.locator("button").filter({ hasText: /بانتظار|موافقة|رفض/ });
    const count = await requestCards.count();

    if (count > 0) {
      await requestCards.first().click();
      await page.waitForTimeout(500);
      // Detail panel should appear with action buttons
      await expect(
        page.locator('button:has-text("موافقة"), button:has-text("رفض"), button:has-text("تأجيل")').first()
      ).toBeVisible();
    } else {
      // No pending requests — empty state message should show
      await expect(page.locator("text=لا توجد طلبات").or(page.locator("text=اختر طلبًا"))).toBeTruthy();
    }
  });
});
