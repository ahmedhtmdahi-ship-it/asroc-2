import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Navigation - Sidebar Links", () => {
  test("employee sees correct sidebar items", async ({ page }) => {
    await loginAs(page, "employee");

    // Core navigation items for employee
    const sidebarItems = [
      "لوحة التحكم",
      "طلب جديد",
      "طلباتي",
    ];

    for (const item of sidebarItems) {
      await expect(page.getByRole("link", { name: item }).or(page.getByText(item))).toBeVisible();
    }
  });

  test("employee cannot see admin links", async ({ page }) => {
    await loginAs(page, "employee");

    // Admin-only items should NOT be visible
    await expect(page.getByRole("link", { name: "إدارة النظام" })).not.toBeVisible();
  });

  test("super admin sees all navigation items", async ({ page }) => {
    await loginAs(page, "super_admin");

    await expect(page.getByText("إدارة النظام")).toBeVisible();
  });

  test("manager sees approvals link", async ({ page }) => {
    await loginAs(page, "manager");

    await expect(
      page.getByText("موافقات").or(page.getByText("الموافقات")),
    ).toBeVisible();
  });
});

test.describe("Navigation - Route Access", () => {
  test("employee can navigate to new request page", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/request/new");
    await expect(page).toHaveURL(/\/request\/new/);
  });

  test("employee can navigate to my-requests", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/my-requests");
    await expect(page).toHaveURL(/\/my-requests/);
  });

  test("employee can navigate to profile", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
  });

  test("employee gets redirected from security page", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/security");
    // Should be redirected to dashboard (not security)
    await expect(page).not.toHaveURL(/\/security/);
  });

  test("employee gets redirected from admin page", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/super-admin");
    await expect(page).not.toHaveURL(/\/super-admin/);
  });

  test("security user can access security page", async ({ page }) => {
    await loginAs(page, "security");
    await page.goto("/security");
    await expect(page).toHaveURL(/\/security/);
  });

  test("doctor user can access doctor page", async ({ page }) => {
    await loginAs(page, "doctor");
    await page.goto("/doctor");
    await expect(page).toHaveURL(/\/doctor/);
  });

  test("pharmacy user can access pharmacy page", async ({ page }) => {
    await loginAs(page, "pharmacy");
    await page.goto("/pharmacy");
    await expect(page).toHaveURL(/\/pharmacy/);
  });

  test("manager can access approvals page", async ({ page }) => {
    await loginAs(page, "manager");
    await page.goto("/manager/approvals");
    await expect(page).toHaveURL(/\/manager\/approvals/);
  });

  test("medical admin can access medical-admin page", async ({ page }) => {
    await loginAs(page, "medical_admin");
    await page.goto("/medical-admin");
    await expect(page).toHaveURL(/\/medical-admin/);
  });

  test("pension admin can access pension-admin page", async ({ page }) => {
    await loginAs(page, "pension_admin");
    await page.goto("/pension-admin");
    await expect(page).toHaveURL(/\/pension-admin/);
  });

  test("super admin can access any page", async ({ page }) => {
    await loginAs(page, "super_admin");

    const pages = [
      "/dashboard",
      "/super-admin",
      "/medical-admin",
      "/pharmacy",
      "/reports",
    ];

    for (const path of pages) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
    }
  });
});

test.describe("Navigation - 404 Page", () => {
  test("shows not-found page for invalid route", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/nonexistent-page-123");
    // Should show some indication of not found
    await expect(
      page.getByText("404").or(page.getByText("غير موجود")).or(page.getByText("not found")),
    ).toBeVisible();
  });
});
