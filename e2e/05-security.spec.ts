import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Security", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "security");
    await page.waitForLoadState("networkidle");
  });

  test("security page renders correctly", async ({ page }) => {
    await expect(page.locator("text=الأمن").first()).toBeVisible();
  });

  test("security check-in/out page loads", async ({ page }) => {
    await page.goto("http://localhost:5173/security/checkinout", {
      waitUntil: "networkidle",
    });
    await expect(page.locator("text=الخروج").or(page.locator("text=خروج")).first()).toBeVisible();
  });

  test("search for employee by financial number", async ({ page }) => {
    await page.waitForTimeout(500);
    const searchInput = page.locator('input[placeholder*="بحث"], input[placeholder*="رقم"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("1234");
      await page.waitForTimeout(500);
      await searchInput.clear();
    }
  });
});
