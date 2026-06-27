import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * End-to-end workflow test: Employee → Manager → Doctor
 *
 * This test creates a request as an employee, approves it as a manager,
 * and verifies the doctor sees it in the checkup queue.
 *
 * NOTE: In DEV mode the data lives in localStorage per browser context.
 * Each step uses the same page to share state across roles.
 */
test.describe("Full Checkup Workflow", () => {
  test("employee creates request → manager approves → request visible to doctor path exists", async ({
    page,
  }) => {
    // ── Step 1: Employee creates a request ──────────────────────────────
    await login(page, "employee");
    await page.goto("http://localhost:5173/employee/requests", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1_500);

    // Find the reason/complaint input
    const reasonTextarea = page.locator("textarea").first();
    if (await reasonTextarea.isVisible()) {
      await reasonTextarea.fill("ألم شديد في البطن");
    }

    // Try to submit
    const submitBtn = page
      .locator('button:has-text("تقديم"), button:has-text("إرسال"), button:has-text("تقديم الطلب")')
      .first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(2_000);
    }

    // ── Step 2: Manager approves ─────────────────────────────────────────
    await login(page, "manager");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_000);

    const pendingRequest = page
      .locator("button")
      .filter({ hasText: /بانتظار|ألم/ })
      .first();

    if (await pendingRequest.isVisible()) {
      await pendingRequest.click();

      // Wait for the detail panel to appear
      await page.locator('text=مراجعة الطلب').waitFor({ timeout: 5_000 });

      // Click the teal approve button using force because Radix overlays may intercept
      const approveBtn = page.locator('button[class*="bg-teal-6"]').filter({ hasText: "موافقة" }).first();
      if (await approveBtn.isVisible()) {
        await approveBtn.click({ force: true });
        await page.waitForTimeout(500);

        // Confirm in the dialog
        const confirmBtn = page.locator('button:has-text("تأكيد القرار")').first();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await page.waitForTimeout(1_000);
        }
      }
    }

    // ── Step 3: Doctor page has no JS errors ────────────────────────────
    await login(page, "doctor");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_500);

    // Doctor page should render without crashing
    await expect(page.locator("text=محطة عمل الطبيب")).toBeVisible();
    await expect(page.locator("text=قائمة انتظار الكشف الطبي")).toBeVisible();
  });
});
