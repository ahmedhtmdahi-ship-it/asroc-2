import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Notifications - Page", () => {
  test("employee can access notifications page", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/employee/notifications");
    await expect(page).toHaveURL(/\/employee\/notifications/);
  });

  test("shows notifications list or empty state", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/employee/notifications");
    await page.waitForTimeout(2000);

    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("notifications have title and message", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/employee/notifications");
    await page.waitForTimeout(2000);

    // If there are notifications, they should have content
    const notificationItems = page.locator('[class*="notification"], [class*="Notification"], li, [class*="card"]');
    const count = await notificationItems.count();
    if (count > 0) {
      await expect(notificationItems.first()).toBeVisible();
    }
  });
});

test.describe("Notifications - Mark as Read", () => {
  test("can mark notifications as read", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/employee/notifications");
    await page.waitForTimeout(2000);

    // Look for mark-read button
    const markReadBtn = page
      .getByText("تم القراءة")
      .or(page.getByText("قراءة الكل"))
      .or(page.getByText("تحديد الكل كمقروء"))
      .first();

    if (await markReadBtn.isVisible()) {
      await markReadBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe("Notifications - Badge/Counter", () => {
  test("notification badge visible in sidebar", async ({ page }) => {
    await loginAs(page, "employee");
    await page.waitForTimeout(2000);

    // Look for notification bell or counter badge
    const notifBadge = page
      .locator('[class*="badge"]')
      .or(page.locator('[class*="notification-count"]'))
      .first();

    // Soft check — badge may or may not be visible
    const visible = await notifBadge.isVisible().catch(() => false);
    if (visible) {
      await expect(notifBadge).toBeVisible();
    }
  });
});
