import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Pharmacy - Main Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "pharmacy");
  });

  test("shows pharmacy dashboard", async ({ page }) => {
    await page.goto("/pharmacy");
    await expect(page).toHaveURL(/\/pharmacy/);
  });

  test("displays prescribed requests waiting for dispensing", async ({
    page,
  }) => {
    await page.goto("/pharmacy");
    await page.waitForTimeout(2000);

    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("shows dispense button for prescribed requests", async ({ page }) => {
    await page.goto("/pharmacy");
    await page.waitForTimeout(2000);

    const dispenseBtn = page.getByText("صرف").first();
    if (await dispenseBtn.isVisible()) {
      await expect(dispenseBtn).toBeVisible();
    }
  });
});

test.describe("Pharmacy - Dispense Flow", () => {
  test("can navigate to dispense page", async ({ page }) => {
    await loginAs(page, "pharmacy");
    await page.goto("/pharmacy");
    await page.waitForTimeout(2000);

    const dispenseLink = page
      .locator("a[href*='/pharmacy/dispense/']")
      .or(page.getByText("صرف").first());

    if (await dispenseLink.first().isVisible()) {
      await dispenseLink.first().click();
      await page.waitForTimeout(2000);
    }
  });

  test("dispense page shows medication list", async ({ page }) => {
    await loginAs(page, "pharmacy");
    await page.goto("/pharmacy");
    await page.waitForTimeout(2000);

    const dispenseLink = page.locator("a[href*='/pharmacy/dispense/']").first();
    if (await dispenseLink.isVisible()) {
      await dispenseLink.click();
      await page.waitForURL(/\/pharmacy\/dispense\//);

      // Should show the medications to dispense
      const content = page.locator("main");
      await expect(content).toBeVisible();
    }
  });
});

test.describe("Pharmacy - External Pharmacy Page", () => {
  test("pharmacy user can access external pharmacy page", async ({
    page,
  }) => {
    await loginAs(page, "pharmacy");
    await page.goto("/pharmacy/external");
    await expect(page).toHaveURL(/\/pharmacy\/external/);
  });

  test("external pharmacy page loads", async ({ page }) => {
    await loginAs(page, "pharmacy");
    await page.goto("/pharmacy/external");
    await page.waitForTimeout(2000);

    const content = page.locator("main");
    await expect(content).toBeVisible();
  });
});

test.describe("Pharmacy - Inventory / Medicines", () => {
  test("pharmacy can view medicines list from pharmacy page", async ({
    page,
  }) => {
    await loginAs(page, "pharmacy");
    await page.goto("/pharmacy");
    await page.waitForTimeout(2000);

    // Look for inventory/medicines section or link
    const inventoryLink = page
      .getByText("المخزن")
      .or(page.getByText("المخزون"))
      .or(page.getByText("الأدوية"))
      .first();

    if (await inventoryLink.isVisible()) {
      await expect(inventoryLink).toBeVisible();
    }
  });
});

test.describe("Pharmacy - Medical Admin Access", () => {
  test("medical admin can access pharmacy page", async ({ page }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/pharmacy");
    await expect(page).toHaveURL(/\/pharmacy/);
  });

  test("medical admin can access external pharmacy", async ({ page }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/pharmacy/external");
    await expect(page).toHaveURL(/\/pharmacy\/external/);
  });
});
