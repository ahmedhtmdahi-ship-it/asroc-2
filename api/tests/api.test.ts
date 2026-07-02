/**
 * اختبارات تكامل للـ API — بتشغّل التطبيق في الذاكرة (app.inject) من غير شبكة.
 * بتركّز على ثوابت الأمان والـ workflow: IDOR، الصلاحيات، تغيير الباسورد، والـ kill switch.
 *
 * التشغيل (في CI بعد prisma generate + migrate deploy على قاعدة اختبار):
 *   NODE_ENV=test DATABASE_URL=file:./test.db JWT_SECRET=test-secret-1234567890 \
 *     node --import tsx --test tests/*.test.ts
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

import { buildApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";

const app = buildApp();

const ids = {
  emp1: "TEST-EMP-1",
  emp2: "TEST-EMP-2",
  mgr: "TEST-MGR-1",
  r1: "TEST-REQ-1",
  r2: "TEST-REQ-2",
};

async function makeUser(
  id: string,
  role: string,
  permissions: string[],
  password: string,
) {
  const passwordHash = await bcrypt.hash(password, 4);
  await prisma.user.upsert({
    where: { id },
    create: {
      id,
      username: id,
      passwordHash,
      name: id,
      role: role as never,
      permissions: JSON.stringify(permissions),
      isActive: true,
    },
    update: { passwordHash, role: role as never, permissions: JSON.stringify(permissions), isActive: true },
  });
}

async function makeRequest(id: string, employeeId: string) {
  await prisma.medicalRequest.upsert({
    where: { id },
    create: {
      id,
      employeeId,
      employeeName: employeeId,
      financialNumber: "0000",
      department: "قسم اختبار",
      reason: "سبب اختبار",
      status: "pending",
    },
    update: { status: "pending" },
  });
}

async function login(username: string, password: string) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { username, password },
  });
  return res;
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

before(async () => {
  await app.ready();
  await makeUser(ids.emp1, "employee", ["create_request", "view_own_requests"], "Emp1Pass!!");
  await makeUser(ids.emp2, "employee", ["create_request", "view_own_requests"], "Emp2Pass!!");
  await makeUser(ids.mgr, "manager", ["approve_request", "reject_request"], "MgrPass!!!");
  await makeRequest(ids.r1, ids.emp1);
  await makeRequest(ids.r2, ids.emp2);
});

after(async () => {
  await prisma.requestTimelineEvent.deleteMany({ where: { requestId: { in: [ids.r1, ids.r2] } } });
  await prisma.notification.deleteMany({ where: { requestId: { in: [ids.r1, ids.r2] } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: [ids.r1, ids.r2] } } });
  await prisma.medicalRequest.deleteMany({ where: { id: { in: [ids.r1, ids.r2] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.emp1, ids.emp2, ids.mgr] } } });
  await prisma.$disconnect();
  await app.close();
});

test("login: صحيح ينجح وخطأ يفشل", async () => {
  const ok = await login(ids.emp1, "Emp1Pass!!");
  assert.equal(ok.statusCode, 200);
  const body = ok.json();
  assert.ok(body.token, "لازم يرجّع token");
  assert.equal(body.user.id, ids.emp1);

  const bad = await login(ids.emp1, "wrong-password");
  assert.equal(bad.statusCode, 401);
});

test("IDOR: الموظف يشوف طلباته بس، ومش قادر يفتح طلب غيره", async () => {
  const token = (await login(ids.emp1, "Emp1Pass!!")).json().token;

  const list = await app.inject({ method: "GET", url: "/requests", headers: auth(token) });
  assert.equal(list.statusCode, 200);
  const rows = list.json() as Array<{ id: string; employeeId: string }>;
  assert.ok(rows.every((r) => r.employeeId === ids.emp1), "كل الطلبات المرجّعة للموظف نفسه");
  assert.ok(rows.some((r) => r.id === ids.r1));
  assert.ok(!rows.some((r) => r.id === ids.r2), "مش المفروض يشوف طلب موظف تاني");

  const other = await app.inject({ method: "GET", url: `/requests/${ids.r2}`, headers: auth(token) });
  assert.equal(other.statusCode, 403, "فتح طلب موظف تاني ممنوع");
});

test("الصلاحيات: الموظف ما يقدرش يوافق، المدير يقدر", async () => {
  const empToken = (await login(ids.emp1, "Emp1Pass!!")).json().token;
  const denied = await app.inject({
    method: "POST",
    url: `/requests/${ids.r1}/transition`,
    headers: auth(empToken),
    payload: { status: "approved" },
  });
  assert.equal(denied.statusCode, 403, "الموظف مالوش صلاحية approve");

  const mgrToken = (await login(ids.mgr, "MgrPass!!!")).json().token;
  const approved = await app.inject({
    method: "POST",
    url: `/requests/${ids.r1}/transition`,
    headers: auth(mgrToken),
    payload: { status: "approved", note: "موافقة اختبار" },
  });
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json().status, "approved");
});

test("workflow: تحويل غير صالح مرفوض (approved → approved)", async () => {
  const mgrToken = (await login(ids.mgr, "MgrPass!!!")).json().token;
  const invalid = await app.inject({
    method: "POST",
    url: `/requests/${ids.r1}/transition`,
    headers: auth(mgrToken),
    payload: { status: "approved" },
  });
  assert.equal(invalid.statusCode, 400, "approved → approved تحويل غير صالح");
});

test("تغيير الباسورد: القديم يفشل والجديد ينجح", async () => {
  const token = (await login(ids.emp2, "Emp2Pass!!")).json().token;
  const changed = await app.inject({
    method: "POST",
    url: "/auth/change-password",
    headers: auth(token),
    payload: { currentPassword: "Emp2Pass!!", newPassword: "NewEmp2Pass!!" },
  });
  assert.equal(changed.statusCode, 200);

  assert.equal((await login(ids.emp2, "Emp2Pass!!")).statusCode, 401, "الباسورد القديم بطل");
  assert.equal((await login(ids.emp2, "NewEmp2Pass!!")).statusCode, 200, "الباسورد الجديد شغّال");
});

test("kill switch: تعطيل الحساب يبطّل التوكن فورًا", async () => {
  const token = (await login(ids.emp2, "NewEmp2Pass!!")).json().token;
  // التوكن شغّال قبل التعطيل
  assert.equal((await app.inject({ method: "GET", url: "/auth/me", headers: auth(token) })).statusCode, 200);

  await prisma.user.update({ where: { id: ids.emp2 }, data: { isActive: false } });

  const afterDeactivate = await app.inject({ method: "GET", url: "/auth/me", headers: auth(token) });
  assert.equal(afterDeactivate.statusCode, 401, "التوكن يتبطّل فور تعطيل الحساب");
});
