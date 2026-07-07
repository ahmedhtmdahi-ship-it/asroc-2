import { test, expect } from "@playwright/test";

let cachedTokens: Record<string, string> = {};

// Passwords may already be rotated to their new value by the auth suite when
// the full suite runs. Map each seed password to the new one so getToken can
// fall back whether this file runs standalone or after 01-auth.
const NEW_PASSWORD: Record<string, string> = {
  admin: "Admin@2025!",
  "خالد 50": "Employee@2025!",
};

async function getToken(
  request: any,
  username: string,
  password: string,
): Promise<string> {
  if (cachedTokens[username]) return cachedTokens[username];
  const candidates = [password, NEW_PASSWORD[password]].filter(Boolean);
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
    const token = await getToken(request, "50", "خالد 50");
    const res = await request.get("http://localhost:4000/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test("employee can access user lookup", async ({ request }) => {
    const token = await getToken(request, "50", "خالد 50");
    const res = await request.get("http://localhost:4000/users/lookup", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("employee can only see own requests", async ({ request }) => {
    const token = await getToken(request, "50", "خالد 50");
    const res = await request.get("http://localhost:4000/requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    for (const req of body) {
      expect(req.employee_id || req.employeeId).toBe("USER-50");
    }
  });

  test("employee cannot create medicines", async ({ request }) => {
    const token = await getToken(request, "50", "خالد 50");
    const res = await request.post("http://localhost:4000/medicines", {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "Test", unit: "tablet" },
    });
    expect(res.status()).toBe(403);
  });

  test("employee cannot access audit logs", async ({ request }) => {
    const token = await getToken(request, "50", "خالد 50");
    const res = await request.get("http://localhost:4000/audit-logs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test("employee cannot access security logs", async ({ request }) => {
    const token = await getToken(request, "50", "خالد 50");
    const res = await request.get("http://localhost:4000/security-logs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("Authorization - Admin Permissions", () => {
  test("admin can see all requests", async ({ request }) => {
    const token = await getToken(request, "admin", "admin");
    const res = await request.get("http://localhost:4000/requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("admin can create medicines", async ({ request }) => {
    const token = await getToken(request, "admin", "admin");
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
    const token = await getToken(request, "admin", "admin");
    const res = await request.get("http://localhost:4000/audit-logs", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe("Authorization - Transition Permissions", () => {
  test("employee cannot approve requests", async ({ request }) => {
    const adminToken = await getToken(request, "admin", "admin");
    const createRes = await request.post("http://localhost:4000/requests", {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        employeeId: "USER-50",
        employeeName: "خالد عيد فرغلى محمد",
        financialNumber: "50",
        department: "الشئون الهندسية",
        reason: "اختبار الصلاحيات",
        serviceType: "checkup",
        requestType: "normal",
      },
    });
    const { id: requestId } = await createRes.json();

    const empToken = await getToken(request, "50", "خالد 50");
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
