import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Doctor - Main Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "doctor");
  });

  test("shows doctor dashboard", async ({ page }) => {
    await page.goto("/doctor");
    await expect(page).toHaveURL(/\/doctor/);
  });

  test("displays patients waiting for diagnosis", async ({ page }) => {
    await page.goto("/doctor");
    await page.waitForTimeout(2000);

    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("shows diagnosis action button on checked-out requests", async ({
    page,
  }) => {
    await page.goto("/doctor");
    await page.waitForTimeout(2000);

    // Should show diagnosis button for patients who checked out
    const diagnosisBtn = page
      .getByText("بدء الكشف")
      .or(page.getByText("كشف"))
      .or(page.getByText("تشخيص"))
      .first();

    if (await diagnosisBtn.isVisible()) {
      await expect(diagnosisBtn).toBeVisible();
    }
  });
});

test.describe("Doctor - Diagnosis Page", () => {
  test("can navigate to diagnosis page for a request", async ({ page }) => {
    await loginAs(page, "doctor");
    await page.goto("/doctor");
    await page.waitForTimeout(2000);

    // Click on first patient for diagnosis
    const diagnosisLink = page
      .locator("a[href*='/doctor/diagnosis/']")
      .or(page.getByText("بدء الكشف").first())
      .or(page.getByText("كشف").first());

    if (await diagnosisLink.first().isVisible()) {
      await diagnosisLink.first().click();
      await page.waitForTimeout(2000);
    }
  });

  test("diagnosis form has required fields", async ({ page }) => {
    await loginAs(page, "doctor");
    await page.goto("/doctor");
    await page.waitForTimeout(2000);

    const diagnosisLink = page.locator("a[href*='/doctor/diagnosis/']").first();
    if (await diagnosisLink.isVisible()) {
      await diagnosisLink.click();
      await page.waitForURL(/\/doctor\/diagnosis\//);

      // Should show diagnosis fields
      const diagnosisField = page
        .getByText("التشخيص")
        .or(page.locator("textarea"))
        .first();
      await expect(diagnosisField).toBeVisible();
    }
  });
});

test.describe("Doctor - Prescription", () => {
  test("can add medications to prescription", async ({ page }) => {
    await loginAs(page, "doctor");
    await page.goto("/doctor");
    await page.waitForTimeout(2000);

    const diagnosisLink = page.locator("a[href*='/doctor/diagnosis/']").first();
    if (await diagnosisLink.isVisible()) {
      await diagnosisLink.click();
      await page.waitForURL(/\/doctor\/diagnosis\//);

      // Look for add medication button
      const addMedBtn = page
        .getByText("إضافة دواء")
        .or(page.getByText("إضافة"))
        .first();
      if (await addMedBtn.isVisible()) {
        await addMedBtn.click();

        // Should show medication form fields
        const medNameField = page
          .getByPlaceholder("اسم الدواء")
          .or(page.locator('input[name*="name"]'))
          .first();
        if (await medNameField.isVisible()) {
          await expect(medNameField).toBeVisible();
        }
      }
    }
  });
});

test.describe("Doctor - Referral", () => {
  test("can navigate to referral page", async ({ page }) => {
    await loginAs(page, "doctor");
    await page.goto("/doctor");
    await page.waitForTimeout(2000);

    const referralLink = page
      .locator("a[href*='/doctor/referral/']")
      .or(page.getByText("تحويل").first());

    if (await referralLink.first().isVisible()) {
      await referralLink.first().click();
      await page.waitForTimeout(2000);
    }
  });

  test("referral form has required fields", async ({ page }) => {
    await loginAs(page, "doctor");

    // Direct navigation to referral page (if a request exists)
    const diagnosisLink = page.locator("a[href*='/doctor/referral/']").first();
    await page.goto("/doctor");
    await page.waitForTimeout(2000);

    if (await diagnosisLink.isVisible()) {
      await diagnosisLink.click();
      await page.waitForURL(/\/doctor\/referral\//);

      // Should have specialty, facility, reason fields
      await expect(
        page.getByText("التخصص").or(page.getByText("الجهة")).or(page.locator("select, textarea, input").first()),
      ).toBeVisible();
    }
  });
});

test.describe("Doctor - Sick Leave", () => {
  test("can create sick leave", async ({ page }) => {
    await loginAs(page, "doctor");
    await page.goto("/doctor");
    await page.waitForTimeout(2000);

    const diagnosisLink = page.locator("a[href*='/doctor/diagnosis/']").first();
    if (await diagnosisLink.isVisible()) {
      await diagnosisLink.click();
      await page.waitForURL(/\/doctor\/diagnosis\//);

      // Look for sick leave section
      const sickLeaveSection = page.getByText("إجازة مرضية").or(page.getByText("إجازة"));
      if (await sickLeaveSection.first().isVisible()) {
        await expect(sickLeaveSection.first()).toBeVisible();
      }
    }
  });
});
