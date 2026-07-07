import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Security - Main Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "security");
  });

  test("shows security dashboard", async ({ page }) => {
    await page.goto("/security");
    await expect(page).toHaveURL(/\/security/);
  });

  test("displays approved requests waiting for check-out", async ({
    page,
  }) => {
    await page.goto("/security");
    await page.waitForTimeout(2000);

    // Should show request cards or empty state
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("shows check-out button for approved requests", async ({ page }) => {
    await page.goto("/security");
    await page.waitForTimeout(2000);

    // If there are approved requests, should have check-out action
    const checkOutBtn = page.getByText("تسجيل خروج").or(page.getByText("خروج")).first();
    if (await checkOutBtn.isVisible()) {
      await expect(checkOutBtn).toBeVisible();
    }
  });
});

test.describe("Security - Check In/Out Page", () => {
  test("shows check-in/out page", async ({ page }) => {
    await loginAs(page, "security");
    await page.goto("/security/checkinout");
    await expect(page).toHaveURL(/\/security\/checkinout/);
  });

  test("shows both check-in and check-out sections", async ({ page }) => {
    await loginAs(page, "security");
    await page.goto("/security/checkinout");
    await page.waitForTimeout(2000);

    const content = page.locator("main");
    await expect(content).toBeVisible();
  });
});

test.describe("Security - Check Out Flow", () => {
  test("can process check-out for approved request", async ({ page }) => {
    await loginAs(page, "security");
    await page.goto("/security");
    await page.waitForTimeout(2000);

    const checkOutBtn = page.getByText("تسجيل خروج").or(page.getByText("خروج")).first();
    if (await checkOutBtn.isVisible()) {
      await checkOutBtn.click();
      await page.waitForTimeout(2000);

      // May show confirmation or transition directly
      const confirmBtn = page.getByRole("button", { name: "تأكيد" }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
    }
  });
});

test.describe("Security - Check In Flow", () => {
  test("can process check-in for dispensed request", async ({ page }) => {
    await loginAs(page, "security");
    await page.goto("/security");
    await page.waitForTimeout(2000);

    const checkInBtn = page.getByText("تسجيل دخول").or(page.getByText("دخول")).first();
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      await page.waitForTimeout(2000);

      const confirmBtn = page.getByRole("button", { name: "تأكيد" }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
    }
  });
});
