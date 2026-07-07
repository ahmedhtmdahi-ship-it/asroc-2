import { test, expect } from "@playwright/test";

let cachedAdminToken: string | null = null;

// admin's password may still be the seed default ("admin") or already rotated
// to the new password by the auth suite — try both so this file passes whether
// it runs standalone or after 01-auth.
const ADMIN_PASSWORDS = ["admin", "Admin@2025!"];

async function loginAdmin(request: any): Promise<any> {
  let lastRes: any;
  for (const password of ADMIN_PASSWORDS) {
    const res = await request.post("http://localhost:4000/auth/login", {
      data: { username: "admin", password },
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
    expect(body.user.name).toBe("مدير النظام");
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
    expect(body.user.name).toBe("مدير النظام");
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
        employeeId: "USER-50",
        employeeName: "خالد عيد فرغلى محمد",
        financialNumber: "50",
        department: "الشئون الهندسية",
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
