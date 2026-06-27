import type { Page } from "@playwright/test";

export const BASE = "http://localhost:5173";
export const PASS = "test123";

/** Login and wait for the URL to change away from the login page. */
export async function login(page: Page, username: string): Promise<string> {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.locator("input#username").fill(username);
  await page.locator("input#password").fill(PASS);
  await page.locator('button[type="submit"]').click();
  await page
    .waitForURL((url) => !url.pathname.endsWith("/"), { timeout: 8_000 })
    .catch(() => {});
  return page.url();
}

/** Logout via the header dropdown. */
export async function logout(page: Page) {
  // Open user dropdown
  const trigger = page.locator('button:has([data-lucide="chevron-down"])').first();
  await trigger.click();
  await page.locator('text=تسجيل الخروج').click();
  await page.waitForURL(BASE + "/", { timeout: 5_000 }).catch(() => {});
}
