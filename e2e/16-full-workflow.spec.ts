import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { tid, statusText } from "./helpers/selectors";

/**
 * المسار الكامل للكشف عبر الواجهة (اختبار حقيقي — مش مسرح):
 * موظف ينشئ طلب → مدير يوافق → أمن يسجّل خروج → طبيب يشخّص ويكتب روشتة →
 * صيدلية تصرف → أمن يسجّل عودة ويغلق → الطلب يبان "مكتمل" للموظف.
 *
 * كل خطوة بتأكّد أثرًا ملموسًا (toast/انتقال حالة/ظهور الطلب في قائمة الدور)،
 * ومفيش `if (isVisible)` ولا `waitForTimeout`. الاعتماد على data-testid ثابتة.
 */

let requestId = "";

// ننتظر استجابة انتقال ناجحة على السيرفر قبل ما ننتقل لدور تاني — بعض الصفحات
// بتكتب fire-and-forget، والانتظار بيمنع إن إغلاق سياق المتصفح يلغي الكتابة.
function waitForTransition(page: Page, id = "[^/]+") {
  return page.waitForResponse(
    (r) =>
      new RegExp(`/requests/${id}/transition`).test(r.url()) &&
      r.request().method() === "POST" &&
      r.ok(),
  );
}

test.describe.serial("المسار الكامل للكشف عبر الواجهة", () => {
  // حالة نظيفة قبل الملف: مفيش طلب مفتوح يعطّل قاعدة «طلب واحد لكل موظف».
  test.beforeAll(async ({ request }) => {
    const res = await request.post("http://localhost:4000/test/reset-workflow");
    expect(res.ok()).toBeTruthy();
  });

  test("١) الموظف ينشئ طلب كشف عادي", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/request/new");

    await page.getByTestId(tid.requestReason).fill("اختبار المسار الكامل - صداع وإرهاق");
    await page.getByTestId(tid.typeNormal).click();
    await page.getByTestId(tid.requestSubmit).click();

    await expect(page.getByText("تم إرسال الطلب بنجاح")).toBeVisible();

    // نلتقط id الطلب من «طلباتي» ونأكّد إنه «بانتظار موافقة المدير».
    await page.goto("/my-requests");
    const idCell = page.locator('[data-testid^="myreq-id-"]').first();
    await expect(idCell).toBeVisible();
    requestId = (await idCell.getAttribute("data-testid"))!.replace("myreq-id-", "");
    expect(requestId).not.toEqual("");
    await expect(page.getByTestId(tid.myreqStatus(requestId))).toHaveText(statusText.pending);
  });

  test("٢) المدير يوافق على الطلب", async ({ page }) => {
    await loginAs(page, "manager");
    await page.goto("/manager/approvals");

    await page.getByTestId(tid.approvalRequest(requestId)).click();
    await page.getByTestId(tid.approveBtn).click();
    const resp = waitForTransition(page, requestId);
    await page.getByTestId(tid.confirmDecision).click();
    await resp;

    await expect(page.getByText("تمت الموافقة على الطلب")).toBeVisible();
  });

  test("٣) الأمن يسجّل خروج الموظف", async ({ page }) => {
    await loginAs(page, "security");
    await page.goto("/security/checkinout");

    const btn = page.getByTestId(tid.checkout(requestId));
    await expect(btn).toBeVisible();
    const resp = waitForTransition(page, requestId);
    await btn.click();
    await resp;
    await expect(page.getByText(/تم تسجيل خروج/)).toBeVisible();
  });

  test("٤) الطبيب يبدأ الكشف ويكتب الروشتة", async ({ page }) => {
    await loginAs(page, "doctor");
    await page.goto("/doctor");

    const startBtn = page.getByTestId(tid.startDiagnosis(requestId));
    await expect(startBtn).toBeVisible();
    const resp = waitForTransition(page, requestId); // انتقال in_diagnosis
    await startBtn.click();
    await resp;
    await expect(page).toHaveURL(new RegExp(`/doctor/diagnosis/${requestId}`));

    await page.getByTestId(tid.diagnosisInput).fill("صداع توتري وإرهاق عام");

    // اختيار دواء من الـ combobox القابل للبحث. cmdk بيختار بالكيبورد بثبات أكتر
    // من كليك على العنصر — نفتح، نتأكد إن فيه أصناف، ننزل سهم ونضغط Enter.
    const combo = page.getByTestId(tid.medicineCombobox);
    await combo.click();
    await expect(page.locator('[data-slot="command-item"]').first()).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    // اتأكد إن الاختيار اتسجّل (الزر مبقاش «اختر الدواء»).
    await expect(combo).not.toContainText("اختر الدواء");

    await page.getByTestId(tid.savePrescription).click();
    await expect(page.getByText("تم حفظ الكشف وإرسال الروشتة للصيدلية")).toBeVisible();
  });

  test("٥) الصيدلية تصرف الروشتة", async ({ page }) => {
    await loginAs(page, "pharmacy");
    await page.goto("/pharmacy");

    const dispenseLink = page.getByTestId(tid.dispense(requestId));
    await expect(dispenseLink).toBeVisible();
    await dispenseLink.click();
    await expect(page).toHaveURL(new RegExp(`/pharmacy/dispense/${requestId}`));

    await page.getByTestId(tid.confirmReview).click();
    const resp = waitForTransition(page, requestId);
    await page.getByTestId(tid.confirmDispense).click();
    await resp;
    await expect(page.getByText("تم الصرف بنجاح")).toBeVisible();
  });

  test("٦) الأمن يسجّل العودة ويغلق الطلب", async ({ page }) => {
    await loginAs(page, "security");
    await page.goto("/security/checkinout");

    const btn = page.getByTestId(tid.checkinComplete(requestId));
    await expect(btn).toBeVisible();
    // بيصدر انتقالين: returned ثم completed — الـ toast بيظهر بعد ما الاتنين ينجحوا.
    await btn.click();
    await expect(page.getByText(/تم تسجيل عودة/)).toBeVisible();
  });

  test("٧) الموظف يشوف الطلب مكتمل", async ({ page }) => {
    await loginAs(page, "employee");
    await page.goto("/my-requests");
    await expect(page.getByTestId(tid.myreqStatus(requestId))).toHaveText(statusText.completed);
  });
});
