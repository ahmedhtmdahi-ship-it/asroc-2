import { test, expect } from "@playwright/test";
import { BASE, PASS, login } from "./helpers";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await expect(page.locator("input#username")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator("text=ASORC").first()).toBeVisible();
  });

  test("wrong password stays on login page", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.locator("input#username").fill("employee");
    await page.locator("input#password").fill("wrongpassword_xyz");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2_000);
    expect(page.url()).toMatch(/localhost:5173\/?$/);
  });

  test("employee login → /employee", async ({ page }) => {
    const url = await login(page, "employee");
    expect(url).toContain("/employee");
  });

  test("superadmin login → /dashboard", async ({ page }) => {
    const url = await login(page, "superadmin");
    expect(url).toMatch(/\/(dashboard|super-admin)/);
  });

  test("doctor login → /doctor", async ({ page }) => {
    const url = await login(page, "doctor");
    expect(url).toContain("/doctor");
  });

  test("manager login → /manager/approvals", async ({ page }) => {
    const url = await login(page, "manager");
    expect(url).toContain("/manager");
  });

  test("security login → /security", async ({ page }) => {
    const url = await login(page, "security");
    expect(url).toContain("/security");
  });

  test("pharmacy login → /pharmacy", async ({ page }) => {
    const url = await login(page, "pharmacy");
    expect(url).toContain("/pharmacy");
  });

  test("medical admin login → /medical-admin", async ({ page }) => {
    const url = await login(page, "medicaladmin");
    expect(url).toContain("/medical-admin");
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await page.goto(`${BASE}/employee`, { waitUntil: "networkidle" });
    expect(page.url()).toMatch(/localhost:5173\/?$/);
  });

  test("wrong role access redirects to own home page", async ({ page }) => {
    // Login as employee then try to access /doctor
    await login(page, "employee");
    await page.goto(`${BASE}/doctor`, { waitUntil: "networkidle" });
    // Should redirect to /employee (employee home), NOT /doctor
    expect(page.url()).toContain("/employee");
  });
});
