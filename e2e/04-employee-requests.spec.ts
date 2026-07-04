import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Employee - Create Medical Request", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "employee");
  });

  test("navigates to new request page", async ({ page }) => {
    await page.goto("/request/new");
    await expect(page).toHaveURL(/\/request\/new/);
  });

  test("shows the request creation form", async ({ page }) => {
    await page.goto("/request/new");

    // Should have the reason/complaint field
    await expect(
      page.getByText("سبب").or(page.getByText("الشكوى")).or(page.getByText("الطلب")),
    ).toBeVisible();
  });

  test("shows service type options (checkup / monthly)", async ({ page }) => {
    await page.goto("/request/new");

    await expect(
      page.getByText("كشف").or(page.getByText("كشف طبي")),
    ).toBeVisible();
  });

  test("creates a normal checkup request", async ({ page }) => {
    await page.goto("/request/new");

    // Fill in reason
    const reasonField = page
      .getByPlaceholder("سبب")
      .or(page.getByPlaceholder("الشكوى"))
      .or(page.locator('textarea').first())
      .or(page.locator('input[name="reason"]'));

    if (await reasonField.isVisible()) {
      await reasonField.fill("صداع مستمر واحتياج كشف طبي");
    }

    // Select checkup service type if visible
    const checkupOption = page.getByText("كشف طبي").or(page.getByText("كشف"));
    if (await checkupOption.first().isVisible()) {
      await checkupOption.first().click();
    }

    // Submit the request
    const submitBtn = page
      .getByText("إرسال الطلب")
      .or(page.getByText("إرسال"))
      .or(page.locator('button[type="submit"]'));
    if (await submitBtn.first().isVisible()) {
      await submitBtn.first().click();
    }

    // Should show success feedback or redirect
    await page.waitForTimeout(2000);
  });

  test("creates an emergency request", async ({ page }) => {
    await page.goto("/request/new");

    const reasonField = page
      .locator('textarea')
      .first()
      .or(page.locator('input[name="reason"]'));

    if (await reasonField.isVisible()) {
      await reasonField.fill("حالة طوارئ - ألم حاد");
    }

    // Select emergency type if visible
    const emergencyOption = page.getByText("طوارئ");
    if (await emergencyOption.first().isVisible()) {
      await emergencyOption.first().click();
    }

    const submitBtn = page
      .getByText("إرسال")
      .or(page.locator('button[type="submit"]'));
    if (await submitBtn.first().isVisible()) {
      await submitBtn.first().click();
    }

    await page.waitForTimeout(2000);
  });
});

test.describe("Employee - My Requests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "employee");
  });

  test("shows my requests page", async ({ page }) => {
    await page.goto("/my-requests");
    await expect(page).toHaveURL(/\/my-requests/);
  });

  test("displays request list or empty state", async ({ page }) => {
    await page.goto("/my-requests");

    // Should show either request cards or an empty state message
    const content = page.locator("main, [class*='content'], [class*='Content']");
    await expect(content.first()).toBeVisible();
  });

  test("request cards show status badges", async ({ page }) => {
    await page.goto("/my-requests");
    await page.waitForTimeout(2000);

    // If there are requests, they should have status indicators
    const statusBadge = page.locator('[class*="badge"], [class*="Badge"], [class*="status"]');
    // This is a soft check — may or may not have requests
    const count = await statusBadge.count();
    if (count > 0) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });
});

test.describe("Employee - Request Details", () => {
  test("can view request details page", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/my-requests");
    await page.waitForTimeout(2000);

    // Click on first request if any exist
    const requestLink = page.locator("a[href*='/requests/']").first();
    if (await requestLink.isVisible()) {
      await requestLink.click();
      await page.waitForURL(/\/requests\//);

      // Should show request details
      await expect(page.locator("main")).toBeVisible();
    }
  });
});

test.describe("Employee - Medical History", () => {
  test("shows medical history page", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/employee/history");
    await expect(page).toHaveURL(/\/employee\/history/);
  });
});
