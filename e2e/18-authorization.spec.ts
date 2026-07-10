import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./helpers/auth";

let cachedTokens: Record<string, string> = {};

// حسابات الاختبار من test-users.json. الباسورد ممكن يكون اتغيّر للجديد لو
// 01-auth اتشغّل قبلنا في نفس الحزمة — بنجرّب الاتنين.
const EMP = TEST_USERS.employee;
const ADMIN = TEST_USERS.super_admin;
const NEW_PASSWORD: Record<string, string> = {
  [ADMIN.username]: ADMIN.newPassword,
  [EMP.username]: EMP.newPassword,
};

async function getToken(
  request: any,
  username: string,
  password: string,
): Promise<string> {
  if (cachedTokens[username]) return cachedTokens[username];
  const candidates = [password, NEW_PASSWORD[username]].filter(Boolean);
  let body: any;
  for (const candidate of candidates) {
    const res = await request.post("http://localhost:4000/auth/login", {
      data: { username, password: candidate },
    });
    if (res.ok()) {
      body = await res.json();
      break;
    }
  }
  cachedTokens[username] = body?.token;
  return body?.token;
}

test.describe("Authorization - Employee Restrictions", () => {
  test("employee cannot list all users", async ({ request }) => {
    const token = await getToken(request, EMP.username, EMP.password);
    const res = await request.get("http://localhost:4000/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test("employee can access user lookup", async ({ request }) => {
    const token = await getToken(request, EMP.username, EMP.password);
    const res = await request.get("http://localhost:4000/users/lookup", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("employee can only see own requests", async ({ request }) => {
    const token = await getToken(request, EMP.username, EMP.password);
    const res = await request.get("http://localhost:4000/requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    for (const req of body) {
      expect(req.employee_id || req.employeeId).toBe("TEST-EMPLOYEE");
    }
  });

  test("employee cannot create medicines", async ({ request }) => {
    const token = await getToken(request, EMP.username, EMP.password);
    const res = await request.post("http://localhost:4000/medicines", {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "Test", unit: "tablet" },
    });
    expect(res.status()).toBe(403);
  });

  test("employee cannot access audit logs", async ({ request }) => {
    const token = await getToken(request, EMP.username, EMP.password);
    const res = await request.get("http://localhost:4000/audit-logs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test("employee cannot access security logs", async ({ request }) => {
    const token = await getToken(request, EMP.username, EMP.password);
    const res = await request.get("http://localhost:4000/security-logs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("Authorization - Admin Permissions", () => {
  test("admin can see all requests", async ({ request }) => {
    const token = await getToken(request, ADMIN.username, ADMIN.password);
    const res = await request.get("http://localhost:4000/requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("admin can create medicines", async ({ request }) => {
    const token = await getToken(request, ADMIN.username, ADMIN.password);
    const res = await request.post("http://localhost:4000/medicines", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "دواء اختبار الصلاحيات",
        unit: "قرص",
        category: "اختبار",
        isActive: true,
      },
    });
    expect(res.status()).toBe(201);
  });

  test("admin can access audit logs", async ({ request }) => {
    const token = await getToken(request, ADMIN.username, ADMIN.password);
    const res = await request.get("http://localhost:4000/audit-logs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe("Authorization - Transition Permissions", () => {
  test("employee cannot approve requests", async ({ request }) => {
    const adminToken = await getToken(request, ADMIN.username, ADMIN.password);
    // بنستخدم TEST-SECURITY (مش TEST-EMPLOYEE) عشان 17-api-health بيسيب طلب
    // مفتوح للموظف ده وقاعدة «طلب مفتوح واحد» هترد 409.
    const createRes = await request.post("http://localhost:4000/requests", {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        employeeId: "TEST-SECURITY",
        employeeName: TEST_USERS.security.name,
        financialNumber: "TEST-SECURITY",
        department: "الأمن",
        reason: "اختبار الصلاحيات",
        serviceType: "checkup",
        requestType: "normal",
      },
    });
    expect(createRes.status(), await createRes.text()).toBe(201);
    const { id: requestId } = await createRes.json();

    const empToken = await getToken(request, EMP.username, EMP.password);
    const res = await request.post(
      `http://localhost:4000/requests/${requestId}/transition`,
      {
        headers: { Authorization: `Bearer ${empToken}` },
        data: { status: "approved" },
      },
    );
    expect(res.status()).toBe(403);
  });
});
