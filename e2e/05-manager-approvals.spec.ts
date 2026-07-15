import { test, expect, type APIRequestContext } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { tid } from "./helpers/selectors";

const API = "http://localhost:4000";

// بيحضّر طلب pending في قسم مدير الاختبار عبر الـ API (أسرع من الواجهة) بعد تنظيف
// الحالة، ويرجّع الـ id. الطلب في نفس قسم test-manager عشان فصل الإدارات يوريه له.
async function seedPendingRequest(request: APIRequestContext): Promise<string> {
  const reset = await request.post(`${API}/test/reset-workflow`);
  expect(reset.ok()).toBeTruthy();

  const login = await request.post(`${API}/auth/login`, {
    data: { username: "test-employee", password: "Test@1234" },
  });
  expect(login.ok()).toBeTruthy();
  const { token, user } = await login.json();

  const created = await request.post(`${API}/requests`, {
    headers: { authorization: `Bearer ${token}` },
    data: {
      employeeId: user.id,
      employeeName: user.name,
      financialNumber: user.financialNumber ?? user.id,
      department: user.department,
      reason: "طلب اختبار لموافقة المدير",
      serviceType: "checkup",
      requestType: "normal",
    },
  });
  expect(created.status()).toBe(201);
  return (await created.json()).id as string;
}

test.describe("المدير — الموافقات", () => {
  let requestId = "";

  test.beforeEach(async ({ page, request }) => {
    requestId = await seedPendingRequest(request);
    await loginAs(page, "manager");
  });

  test("صفحة الموافقات بتفتح وبتعرض الطلب المعلّق", async ({ page }) => {
    await page.goto("/manager/approvals");
    await expect(page).toHaveURL(/\/manager\/approvals/);
    await expect(page.getByTestId(tid.approvalRequest(requestId))).toBeVisible();
  });

  test("الموافقة بتحوّل الطلب وبتشيله من قائمة المعلّق", async ({ page }) => {
    await page.goto("/manager/approvals");
    await page.getByTestId(tid.approvalRequest(requestId)).click();
    await page.getByTestId(tid.approveBtn).click();
    await page.getByTestId(tid.confirmDecision).click();

    await expect(page.getByText("تمت الموافقة على الطلب")).toBeVisible();
    // فلتر «pending» الافتراضي: الطلب المعتمَد بيختفي من القائمة.
    await expect(page.getByTestId(tid.approvalRequest(requestId))).toBeHidden();
  });

  test("الرفض بيظهر تنبيه الرفض وبيشيل الطلب من المعلّق", async ({ page }) => {
    await page.goto("/manager/approvals");
    await page.getByTestId(tid.approvalRequest(requestId)).click();
    await page.getByTestId(tid.rejectBtn).click();
    await page.getByTestId(tid.confirmDecision).click();

    await expect(page.getByText("تم رفض الطلب")).toBeVisible();
    await expect(page.getByTestId(tid.approvalRequest(requestId))).toBeHidden();
  });
});

test.describe("مدير المكتب — الوصول للموافقات", () => {
  test("مدير المكتب يقدر يفتح صفحة الموافقات", async ({ page }) => {
    await loginAs(page, "office_manager");
    await page.goto("/manager/approvals");
    await expect(page).toHaveURL(/\/manager\/approvals/);
  });
});
