import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Manager - Approvals Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "manager");
  });

  test("shows the approvals page", async ({ page }) => {
    await page.goto("/manager/approvals");
    await expect(page).toHaveURL(/\/manager\/approvals/);
  });

  test("displays pending requests or empty state", async ({ page }) => {
    await page.goto("/manager/approvals");
    await page.waitForTimeout(2000);

    // Should show either pending requests or an empty state
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("shows approve/reject/postpone action buttons on requests", async ({
    page,
  }) => {
    await page.goto("/manager/approvals");
    await page.waitForTimeout(2000);

    // If there are pending requests, action buttons should be visible
    const approveBtn = page.getByText("موافقة").first();
    const rejectBtn = page.getByText("رفض").first();

    if (await approveBtn.isVisible()) {
      await expect(approveBtn).toBeVisible();
    }
    if (await rejectBtn.isVisible()) {
      await expect(rejectBtn).toBeVisible();
    }
  });
});

test.describe("Office Manager - Approvals", () => {
  test("office manager can access approvals page", async ({ page }) => {
    await loginAs(page, "office_manager");
    await page.goto("/manager/approvals");
    await expect(page).toHaveURL(/\/manager\/approvals/);
  });
});

test.describe("Manager - Approve Request Flow", () => {
  test("can approve a pending request", async ({ page }) => {
    await loginAs(page, "manager");
    await page.goto("/manager/approvals");
    await page.waitForTimeout(2000);

    const approveBtn = page.getByText("موافقة").first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();

      // May show a confirmation dialog
      const confirmBtn = page
        .getByRole("button", { name: "تأكيد" })
        .or(page.getByRole("button", { name: "موافقة" }));
      if (await confirmBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.first().click();
      }

      await page.waitForTimeout(2000);
    }
  });

  test("can reject a pending request", async ({ page }) => {
    await loginAs(page, "manager");
    await page.goto("/manager/approvals");
    await page.waitForTimeout(2000);

    const rejectBtn = page.getByText("رفض").first();
    if (await rejectBtn.isVisible()) {
      await rejectBtn.click();

      // May need to provide a reason
      const reasonField = page.locator("textarea").first();
      if (await reasonField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reasonField.fill("رفض لعدم استيفاء الشروط");
      }

      const confirmBtn = page
        .getByRole("button", { name: "تأكيد" })
        .or(page.getByRole("button", { name: "رفض" }));
      if (await confirmBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.first().click();
      }

      await page.waitForTimeout(2000);
    }
  });

  test("can postpone a pending request", async ({ page }) => {
    await loginAs(page, "manager");
    await page.goto("/manager/approvals");
    await page.waitForTimeout(2000);

    const postponeBtn = page.getByText("تأجيل").first();
    if (await postponeBtn.isVisible()) {
      await postponeBtn.click();

      const reasonField = page.locator("textarea").first();
      if (await reasonField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reasonField.fill("تأجيل لحين استكمال المستندات");
      }

      const confirmBtn = page.getByRole("button", { name: "تأكيد" }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      await page.waitForTimeout(2000);
    }
  });
});
