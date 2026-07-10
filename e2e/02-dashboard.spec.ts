import { test, expect } from "@playwright/test";
import { HOME_PATH, loginAs, TEST_USERS } from "./helpers/auth";

test.describe("Dashboard - Employee View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "employee");
  });

  test("shows dashboard after login", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(HOME_PATH.employee));
  });

  test("displays user greeting with name", async ({ page }) => {
    await expect(
      page.getByText(TEST_USERS.employee.name),
    ).toBeVisible();
  });

  test("shows employee-specific navigation items", async ({ page }) => {
    await expect(page.getByText("طلب جديد")).toBeVisible();
    await expect(page.getByText("طلباتي")).toBeVisible();
  });

  test("shows quick action cards", async ({ page }) => {
    // Employee should see request creation quick action
    const quickActions = page.locator('[class*="card"], [class*="Card"]');
    await expect(quickActions.first()).toBeVisible();
  });
});

test.describe("Dashboard - Manager View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "manager");
  });

  test("shows dashboard for manager", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("displays manager name", async ({ page }) => {
    await expect(
      page.getByText(TEST_USERS.manager.name),
    ).toBeVisible();
  });
});

test.describe("Dashboard - Security View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "security");
  });

  test("shows dashboard for security", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(HOME_PATH.security));
  });

  test("displays security user name", async ({ page }) => {
    await expect(
      page.getByText(TEST_USERS.security.name),
    ).toBeVisible();
  });
});

test.describe("Dashboard - Super Admin View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "super_admin");
  });

  test("shows dashboard for super admin", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("shows admin-specific navigation", async ({ page }) => {
    await expect(page.getByText("إدارة النظام")).toBeVisible();
  });
});

test.describe("Dashboard - Medical Admin View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "medical_admin");
  });

  test("shows dashboard for medical admin", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(HOME_PATH.medical_admin));
  });
});

test.describe("Dashboard - Doctor View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "doctor");
  });

  test("shows dashboard for doctor", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(HOME_PATH.doctor));
  });
});

test.describe("Dashboard - Pharmacy View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "pharmacy");
  });

  test("shows dashboard for pharmacy", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(HOME_PATH.pharmacy));
  });
});

test.describe("Dashboard - Pension Admin View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "pension_admin");
  });

  test("shows dashboard for pension admin", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(HOME_PATH.pension_admin));
  });
});

test.describe("Dashboard - Office Manager View", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "office_manager");
  });

  test("shows dashboard for office manager", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
