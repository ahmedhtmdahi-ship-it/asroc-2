import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { tid, statusText } from "./helpers/selectors";

/**
 * المسار الكامل للعلاج الشهري عبر الواجهة (اختبار حقيقي):
 * موظف ينشئ طلب علاج شهري → مشرف المعاشات يعتمده ويصرفه ويغلق الدورة من صفحة
 * «إدارة العلاج الشهري» → الطلب يبان «مكتمل» للموظف.
 *
 * مسار مستقل عن مسار الكشف (16) — بيغطّي حالات pending_monthly_doctor حتى
 * monthly_completed اللي مكنتش متغطّية بأي اختبار متصفح.
 */

let requestId = "";

// بيعدّ استجابات الانتقال الناجحة لحد ما توصل العدد المطلوب — handleApprove بيصدر
// انتقالين (monthly_approved ثم monthly_ready_pharmacy) fire-and-forget، فلازم
// نستنّى الاتنين يوصلوا السيرفر قبل الصرف.
function waitForTransitions(page: Page, count: number) {
  let seen = 0;
  return page.waitForResponse((r) => {
    if (/\/requests\/[^/]+\/transition/.test(r.url()) && r.request().method() === "POST" && r.ok()) {
      seen += 1;
    }
    return seen >= count;
  });
}

test.describe.serial("المسار الكامل للعلاج الشهري عبر الواجهة", () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post("http://localhost:4000/test/reset-workflow");
    expect(res.ok()).toBeTruthy();
  });

  test("١) الموظف ينشئ طلب علاج شهري", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/request/new");

    await page.getByTestId(tid.serviceMonthly).click();
    await page.getByTestId(tid.requestReason).fill("علاج مزمن للضغط - تجديد شهري");
    await page.getByTestId(tid.requestSubmit).click();

    await expect(page.getByText("تم إرسال الطلب بنجاح")).toBeVisible();

    await page.goto("/my-requests");
    const idCell = page.locator('[data-testid^="myreq-id-"]').first();
    await expect(idCell).toBeVisible();
    requestId = (await idCell.getAttribute("data-testid"))!.replace("myreq-id-", "");
    expect(requestId).not.toEqual("");
    // الحالة الأولية: بانتظار مراجعة طبيب العلاج الشهري.
    await expect(page.getByTestId(tid.myreqStatus(requestId))).toHaveText(
      "بانتظار مراجعة طبيب العلاج الشهري",
    );
  });

  test("٢) مشرف المعاشات يعتمد ويرسل للصيدلية", async ({ page }) => {
    await loginAs(page, "pension_admin");
    await page.goto("/monthly-treatment");

    const approve = page.getByTestId(tid.monthlyApprove(requestId));
    await expect(approve).toBeVisible();
    const bothLanded = waitForTransitions(page, 2); // approved + ready_pharmacy
    await approve.click();
    await bothLanded;
    // بعد الاعتماد: زر الصرف بيفعّل ونصّه «صرف العلاج» (monthly_ready_pharmacy).
    await expect(page.getByTestId(tid.monthlyDispense(requestId))).toBeEnabled();
    await expect(page.getByTestId(tid.monthlyDispense(requestId))).toContainText("صرف العلاج");
  });

  test("٣) مشرف المعاشات يصرف العلاج", async ({ page }) => {
    await loginAs(page, "pension_admin");
    await page.goto("/monthly-treatment");

    const dispense = page.getByTestId(tid.monthlyDispense(requestId));
    await expect(dispense).toBeEnabled();
    const landed = waitForTransitions(page, 1); // ready_pharmacy → dispensed
    await dispense.click();
    await landed;
    // تأكيد بحالة ثابتة (مش toast عابر): الزر بيتحوّل لـ «إغلاق الدورة».
    await expect(page.getByTestId(tid.monthlyDispense(requestId))).toContainText("إغلاق الدورة");
  });

  test("٤) مشرف المعاشات يغلق الدورة", async ({ page }) => {
    await loginAs(page, "pension_admin");
    await page.goto("/monthly-treatment");

    const close = page.getByTestId(tid.monthlyDispense(requestId));
    await expect(close).toBeEnabled();
    await expect(close).toContainText("إغلاق الدورة");
    const landed = waitForTransitions(page, 1); // dispensed → completed
    await close.click();
    await landed;
    // بعد الإغلاق (monthly_completed) الزر بيتعطّل — canDispense بقت false.
    await expect(page.getByTestId(tid.monthlyDispense(requestId))).toBeDisabled();
  });

  test("٥) الموظف يشوف العلاج الشهري مكتمل", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/my-requests");
    await expect(page.getByTestId(tid.myreqStatus(requestId))).toHaveText(statusText.completed);
  });
});
