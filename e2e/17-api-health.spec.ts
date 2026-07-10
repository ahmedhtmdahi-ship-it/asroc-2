import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./helpers/auth";

let cachedAdminToken: string | null = null;

// حساب super_admin للاختبارات (test-admin من test-users.json) — بنجرّب الباسورد
// الأساسي والجديد عشان الملف يعدي سواء اتشغّل لوحده أو بعد 01-auth.
const ADMIN = TEST_USERS.super_admin;
const ADMIN_PASSWORDS = [ADMIN.password, ADMIN.newPassword];

async function loginAdmin(request: any): Promise<any> {
  let lastRes: any;
  for (const password of ADMIN_PASSWORDS) {
    const res = await request.post("http://localhost:4000/auth/login", {
      data: { username: ADMIN.username, password },
    });
    if (res.ok()) return res;
    lastRes = res;
  }
  return lastRes;
}

async function getAdminToken(request: any): Promise<string> {
  if (cachedAdminToken) return cachedAdminToken;
  const res = await loginAdmin(request);
  const body = await res.json();
  cachedAdminToken = body.token;
  return cachedAdminToken!;
}

test.describe("API Health Checks", () => {
  test("live endpoint returns ok", async ({ request }) => {
    const response = await request.get("http://localhost:4000/health/live");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("ready endpoint returns ok with db up", async ({ request }) => {
    const response = await request.get("http://localhost:4000/health/ready");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.db).toBe("up");
  });
});

test.describe("API Auth Endpoints", () => {
  test("login with valid credentials returns token", async ({ request }) => {
    const response = await loginAdmin(request);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.token).toBeTruthy();
    expect(body.user).toBeTruthy();
    expect(body.user.name).toBe(ADMIN.name);
    cachedAdminToken = body.token;
  });

  test("login with invalid credentials returns 401", async ({ request }) => {
    const response = await request.post("http://localhost:4000/auth/login", {
      data: { username: "nonexistent", password: "wrong" },
    });
    expect(response.status()).toBe(401);
  });

  test("me endpoint without token returns 401", async ({ request }) => {
    const response = await request.get("http://localhost:4000/auth/me");
    expect(response.status()).toBe(401);
  });

  test("me endpoint with valid token returns user", async ({ request }) => {
    const token = await getAdminToken(request);
    const meRes = await request.get("http://localhost:4000/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.ok()).toBeTruthy();
    const body = await meRes.json();
    expect(body.user.name).toBe(ADMIN.name);
  });
});

test.describe("API CRUD Endpoints (admin token)", () => {
  test("list requests", async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.get("http://localhost:4000/requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("create request via API", async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.post("http://localhost:4000/requests", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        employeeId: "TEST-EMPLOYEE",
        employeeName: TEST_USERS.employee.name,
        financialNumber: "TEST-EMPLOYEE",
        department: "التقطير",
        reason: "اختبار API - صداع",
        serviceType: "checkup",
        requestType: "normal",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.status).toBe("pending");
  });

  test("list users", async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.get("http://localhost:4000/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  test("user lookup", async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.get("http://localhost:4000/users/lookup", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("user lookup with role filter", async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.get(
      "http://localhost:4000/users/lookup?roles=doctor",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(res.ok()).toBeTruthy();
  });

  test("list medicines", async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.get("http://localhost:4000/medicines", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  test("list notifications", async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.get("http://localhost:4000/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("mark notifications as read", async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.patch(
      "http://localhost:4000/notifications/mark-read",
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {},
      },
    );
    expect(res.ok()).toBeTruthy();
  });

  test("audit logs", async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.get("http://localhost:4000/audit-logs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("audit logs count", async ({ request }) => {
    const token = await getAdminToken(request);
    const res = await request.get("http://localhost:4000/audit-logs/count", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body.count).toBe("number");
  });
});
