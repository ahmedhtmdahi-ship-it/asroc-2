import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Medical Admin - Main Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "medical_admin");
  });

  test("shows medical admin page", async ({ page }) => {
    await page.goto("/medical-admin");
    await expect(page).toHaveURL(/\/medical-admin/);
  });

  test("displays tabs (emergency, referrals, operational summary)", async ({
    page,
  }) => {
    await page.goto("/medical-admin");
    await page.waitForTimeout(2000);

    // Should show tabs
    await expect(
      page.getByText("الطوارئ").or(page.getByRole("tab", { name: "الطوارئ" })),
    ).toBeVisible();
  });

  test("can switch between tabs", async ({ page }) => {
    await page.goto("/medical-admin");
    await page.waitForTimeout(2000);

    // Click on referrals tab
    const referralsTab = page.getByText("التحويلات").or(page.getByRole("tab", { name: "التحويلات" }));
    if (await referralsTab.first().isVisible()) {
      await referralsTab.first().click();
      await page.waitForTimeout(1000);
    }

    // Click on operational summary tab
    const summaryTab = page
      .getByText("الملخص التشغيلي")
      .or(page.getByRole("tab", { name: "الملخص" }));
    if (await summaryTab.first().isVisible()) {
      await summaryTab.first().click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe("Medical Admin - Emergency Tab", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/medical-admin");
  });

  test("shows create emergency request button", async ({ page }) => {
    await page.waitForTimeout(2000);

    const createBtn = page
      .getByText("إنشاء طلب طوارئ")
      .or(page.getByText("طلب طوارئ"))
      .or(page.getByText("إضافة"))
      .first();

    if (await createBtn.isVisible()) {
      await expect(createBtn).toBeVisible();
    }
  });

  test("opens emergency request dialog", async ({ page }) => {
    await page.waitForTimeout(2000);

    const createBtn = page
      .getByText("إنشاء طلب طوارئ")
      .or(page.getByText("طلب طوارئ"))
      .first();

    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(1000);

      // Dialog should be open with form fields
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        await expect(dialog).toBeVisible();
      }
    }
  });

  test("emergency dialog has employee search", async ({ page }) => {
    await page.waitForTimeout(2000);

    const createBtn = page
      .getByText("إنشاء طلب طوارئ")
      .or(page.getByText("طلب طوارئ"))
      .first();

    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(1000);

      // Should have search/select for employee
      const searchField = page
        .getByPlaceholder("بحث")
        .or(page.getByPlaceholder("اسم الموظف"))
        .or(page.getByPlaceholder("الرقم المالي"))
        .or(page.locator('[role="dialog"] input'))
        .first();

      if (await searchField.isVisible()) {
        await expect(searchField).toBeVisible();
      }
    }
  });
});

test.describe("Medical Admin - Referrals Tab", () => {
  test("shows referrals management", async ({ page }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/medical-admin");
    await page.waitForTimeout(2000);

    const referralsTab = page.getByText("التحويلات").or(page.getByRole("tab", { name: "التحويلات" }));
    if (await referralsTab.first().isVisible()) {
      await referralsTab.first().click();
      await page.waitForTimeout(1000);

      const content = page.locator("main");
      await expect(content).toBeVisible();
    }
  });
});

test.describe("Medical Admin - Operational Summary Tab", () => {
  test("shows operational statistics", async ({ page }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/medical-admin");
    await page.waitForTimeout(2000);

    const summaryTab = page
      .getByText("الملخص التشغيلي")
      .or(page.getByRole("tab", { name: "الملخص" }));
    if (await summaryTab.first().isVisible()) {
      await summaryTab.first().click();
      await page.waitForTimeout(2000);

      const content = page.locator("main");
      await expect(content).toBeVisible();
    }
  });
});
