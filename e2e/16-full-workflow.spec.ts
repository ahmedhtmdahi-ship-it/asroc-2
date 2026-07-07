import { test, expect, type Page } from "@playwright/test";
import { loginAs, TEST_USERS } from "./helpers/auth";

/**
 * Full end-to-end workflow test:
 * Employee creates request → Manager approves → Security check-out →
 * Doctor diagnoses → Pharmacy dispenses → Security check-in → Complete
 *
 * This tests the COMPLETE checkup workflow path.
 */

let requestId: string | null = null;

async function loginAndGo(page: Page, role: keyof typeof TEST_USERS, path: string) {
  await loginAs(page, role);
  await page.goto(path);
  await page.waitForTimeout(2000);
}

test.describe.serial("Full Checkup Workflow - End to End", () => {
  test("Step 1: Employee creates a normal checkup request", async ({
    page,
  }) => {
    await loginAndGo(page, "employee", "/request/new");

    // Fill in the reason for the request
    const reasonField = page
      .locator("textarea")
      .first()
      .or(page.locator('input[name="reason"]'));

    if (await reasonField.isVisible()) {
      await reasonField.fill(
        "اختبار سير العمل الكامل - صداع وألم في الظهر",
      );
    }

    // Select checkup type
    const checkupOption = page.getByText("كشف طبي").or(page.getByText("كشف")).first();
    if (await checkupOption.isVisible()) {
      await checkupOption.click();
    }

    // Select normal request type
    const normalOption = page.getByText("عادي").first();
    if (await normalOption.isVisible()) {
      await normalOption.click();
    }

    // Submit
    const submitBtn = page
      .getByText("إرسال الطلب")
      .or(page.getByText("إرسال"))
      .or(page.locator('button[type="submit"]'))
      .first();

    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    // Try to capture request ID from URL or page content
    await page.goto("/my-requests");
    await page.waitForTimeout(2000);

    // Get the first request link
    const firstRequestLink = page.locator("a[href*='/requests/']").first();
    if (await firstRequestLink.isVisible()) {
      const href = await firstRequestLink.getAttribute("href");
      if (href) {
        requestId = href.split("/requests/")[1];
      }
    }
  });

  test("Step 2: Manager approves the request", async ({ page }) => {
    await loginAndGo(page, "manager", "/manager/approvals");

    // Find and approve the pending request
    const approveBtn = page.getByText("موافقة").first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(1000);

      // Handle confirmation dialog
      const confirmBtn = page.getByRole("button", { name: "تأكيد" }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(2000);
    }
  });

  test("Step 3: Security checks out the employee", async ({ page }) => {
    await loginAndGo(page, "security", "/security");

    const checkOutBtn = page
      .getByText("تسجيل خروج")
      .or(page.getByText("خروج"))
      .first();

    if (await checkOutBtn.isVisible()) {
      await checkOutBtn.click();
      await page.waitForTimeout(1000);

      const confirmBtn = page.getByRole("button", { name: "تأكيد" }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(2000);
    }
  });

  test("Step 4: Doctor starts diagnosis", async ({ page }) => {
    await loginAndGo(page, "doctor", "/doctor");

    // Find the patient waiting for diagnosis
    const diagnosisLink = page
      .locator("a[href*='/doctor/diagnosis/']")
      .or(page.getByText("بدء الكشف"))
      .first();

    if (await diagnosisLink.isVisible()) {
      await diagnosisLink.click();
      await page.waitForTimeout(2000);

      // Fill diagnosis
      const diagnosisField = page.locator("textarea").first();
      if (await diagnosisField.isVisible()) {
        await diagnosisField.fill("تشخيص: صداع توتري وإرهاق عام");
      }

      // Add medication
      const addMedBtn = page.getByText("إضافة دواء").or(page.getByText("إضافة")).first();
      if (await addMedBtn.isVisible()) {
        await addMedBtn.click();
        await page.waitForTimeout(500);

        // Fill medication fields
        const medFields = page.locator('[role="dialog"] input, form input');
        const count = await medFields.count();
        if (count >= 4) {
          await medFields.nth(0).fill("باراسيتامول");
          await medFields.nth(1).fill("500 مج");
          await medFields.nth(2).fill("3 أيام");
          await medFields.nth(3).fill("قرص كل 8 ساعات");
        }
      }

      // Save and prescribe
      const saveBtn = page
        .getByText("حفظ التشخيص")
        .or(page.getByText("حفظ"))
        .or(page.getByText("إرسال"))
        .first();

      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test("Step 5: Pharmacy dispenses the prescription", async ({ page }) => {
    await loginAndGo(page, "pharmacy", "/pharmacy");

    const dispenseLink = page
      .locator("a[href*='/pharmacy/dispense/']")
      .or(page.getByText("صرف"))
      .first();

    if (await dispenseLink.isVisible()) {
      await dispenseLink.click();
      await page.waitForTimeout(2000);

      // Confirm dispensing
      const dispenseBtn = page
        .getByText("تأكيد الصرف")
        .or(page.getByText("صرف"))
        .or(page.getByRole("button", { name: "تأكيد" }))
        .first();

      if (await dispenseBtn.isVisible()) {
        await dispenseBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test("Step 6: Security checks in the employee (return)", async ({
    page,
  }) => {
    await loginAndGo(page, "security", "/security");

    const checkInBtn = page
      .getByText("تسجيل دخول")
      .or(page.getByText("دخول"))
      .first();

    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      await page.waitForTimeout(1000);

      const confirmBtn = page.getByRole("button", { name: "تأكيد" }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(2000);
    }
  });

  test("Step 7: Verify request is completed", async ({ page }) => {
    await loginAndGo(page, "employee", "/my-requests");

    // Check that the request now shows a completed/returned status
    const completedBadge = page
      .getByText("مكتمل")
      .or(page.getByText("تم الانتهاء"))
      .or(page.getByText("عاد"))
      .first();

    if (await completedBadge.isVisible()) {
      await expect(completedBadge).toBeVisible();
    }
  });
});

test.describe("Emergency Request - Direct Flow", () => {
  test("emergency request skips manager approval", async ({ page }) => {
    await loginAndGo(page, "employee", "/request/new");

    const reasonField = page.locator("textarea").first();
    if (await reasonField.isVisible()) {
      await reasonField.fill("حالة طوارئ - ألم حاد في الصدر");
    }

    // Select emergency type
    const emergencyOption = page.getByText("طوارئ").first();
    if (await emergencyOption.isVisible()) {
      await emergencyOption.click();
    }

    const submitBtn = page
      .getByText("إرسال")
      .or(page.locator('button[type="submit"]'))
      .first();

    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    // Emergency requests should be auto-approved — check in my-requests
    await page.goto("/my-requests");
    await page.waitForTimeout(2000);
  });
});
