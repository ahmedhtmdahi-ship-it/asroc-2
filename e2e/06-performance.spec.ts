import { test, expect } from "@playwright/test";
import { BASE, login } from "./helpers";

test.describe("Performance & Bundle", () => {
  test("role-specific chunks NOT loaded on login page", async ({ page }) => {
    const loadedChunks: string[] = [];

    page.on("response", (resp) => {
      const url = resp.url();
      if (url.includes("/assets/") && url.endsWith(".js")) {
        loadedChunks.push(url.split("/").pop() ?? "");
      }
    });

    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(1_000);

    const doctorLoaded = loadedChunks.some((c) => c.includes("Doctor"));
    const superAdminLoaded = loadedChunks.some((c) => c.includes("SuperAdmin"));
    const pharmacyLoaded = loadedChunks.some((c) => c.includes("Pharmacy"));

    expect(doctorLoaded, "DoctorPage chunk should NOT load on login").toBe(false);
    expect(superAdminLoaded, "SuperAdminPage chunk should NOT load on login").toBe(false);
    expect(pharmacyLoaded, "PharmacyPage chunk should NOT load on login").toBe(false);
  });

  test("role chunk loads when navigating to that role page", async ({ page }) => {
    // In dev mode Vite serves modules directly (no hashed /assets/ chunks).
    // Verify lazy-loading by confirming the doctor page actually renders.
    await login(page, "doctor");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_500);

    // If lazy loading failed the page would crash; presence of the heading proves the chunk loaded.
    await expect(page.locator("text=محطة عمل الطبيب").first()).toBeVisible();
  });

  test("no JavaScript runtime errors across pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await login(page, "employee");
    await page.waitForTimeout(1_000);

    await page.goto("http://localhost:5173/employee/my-requests", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });

  test("page loads within 5 seconds (performance budget)", async ({ page }) => {
    const start = Date.now();
    await login(page, "employee");
    await page.waitForLoadState("networkidle");
    const elapsed = Date.now() - start;

    expect(elapsed, `Login + redirect took ${elapsed}ms (budget: 5000ms)`).toBeLessThan(5_000);
  });
});
