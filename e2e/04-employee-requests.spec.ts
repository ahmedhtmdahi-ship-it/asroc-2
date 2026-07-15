import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { tid, statusText } from "./helpers/selectors";

// اختبارات حقيقية لإنشاء الطلب: كل واحد بيبدأ من حالة نظيفة (reset) وبيأكّد أثرًا
// ملموسًا (toast + ظهور الطلب بحالته الصحيحة) — مفيش if(isVisible) ولا waitForTimeout.
test.describe("الموظف — إنشاء طلب طبي", () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.post("http://localhost:4000/test/reset-workflow");
    expect(res.ok()).toBeTruthy();
    await loginAs(page, "employee");
  });

  test("سبب فاضي بيمنع الإرسال (تحقّق required في المتصفح)", async ({ page }) => {
    await page.goto("/request/new");
    await page.getByTestId(tid.requestSubmit).click();
    // حقل السبب `required` — المتصفح بيوقف الإرسال (valueMissing) قبل ما يوصل للسيرفر.
    const reason = page.getByTestId(tid.requestReason);
    const valueMissing = await reason.evaluate(
      (el) => (el as HTMLTextAreaElement).validity.valueMissing,
    );
    expect(valueMissing).toBeTruthy();
    // وما اتنقلناش لأي حالة نجاح.
    await expect(page.getByText("تم إرسال الطلب بنجاح")).toBeHidden();
  });

  test("إنشاء كشف عادي بيظهر «بانتظار موافقة المدير» في طلباتي", async ({ page }) => {
    await page.goto("/request/new");
    await page.getByTestId(tid.requestReason).fill("صداع مستمر واحتياج كشف طبي");
    await page.getByTestId(tid.typeNormal).click();
    await page.getByTestId(tid.requestSubmit).click();

    await expect(page.getByText("تم إرسال الطلب بنجاح")).toBeVisible();

    await page.goto("/my-requests");
    const statusBadge = page.locator('[data-testid^="myreq-status-"]').first();
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toHaveText(statusText.pending);
  });

  test("كشف طوارئ بيتعمل approve فورًا (بيظهر «تمت الموافقة»)", async ({ page }) => {
    await page.goto("/request/new");
    await page.getByTestId(tid.requestReason).fill("حالة طوارئ - ألم حاد في الصدر");
    await page.getByTestId(tid.typeEmergency).click();
    await page.getByTestId(tid.requestSubmit).click();

    await expect(page.getByText("تم إرسال الطلب بنجاح")).toBeVisible();

    await page.goto("/my-requests");
    const statusBadge = page.locator('[data-testid^="myreq-status-"]').first();
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toHaveText(statusText.approved);
  });
});

test.describe("الموظف — طلباتي", () => {
  test("قائمة طلباتي بتفتح", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/my-requests");
    await expect(page).toHaveURL(/\/my-requests/);
  });
});
