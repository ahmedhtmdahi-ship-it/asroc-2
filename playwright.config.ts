import { defineConfig, devices } from "@playwright/test";
const isCI = Boolean((globalThis as any).process?.env?.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: "html",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
  baseURL: "http://localhost:5173",
  trace: "on-first-retry",
  screenshot: "only-on-failure",
  locale: "ar-EG",
  timezoneId: "Africa/Cairo",
},

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      // NODE_ENV=test يمنع تسجيل الـ rate-limit plugin (شوف api/src/app.ts)
      // عشان تشغيل الحزمة كاملة ما يتحظرش على /auth/login.
      // بنمرّرها عبر env (مش prefix في الأمر) عشان تشتغل على Windows/cmd برضه.
      command: "pnpm --filter @asroc/api dev",
      env: { NODE_ENV: "test" },
      port: 4000,
      reuseExistingServer: !isCI,
      timeout: 30_000,
    },
    {
      command: "pnpm dev",
      port: 5173,
      reuseExistingServer: !isCI,
      timeout: 30_000,
    },
  ],
});
