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
import { rm } from "node:fs/promises";
import bcrypt from "bcryptjs";

import { buildApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { env } from "../src/env.js";

const app = buildApp();

const DEPT_A = "قسم اختبار";
const DEPT_B = "قسم تاني";

const ids = {
  emp1: "TEST-EMP-1",
  emp2: "TEST-EMP-2",
  emp3: "TEST-EMP-3", // لاختبارات قواعد إنشاء الطلب والمرفقات
  admin: "TEST-SUPER-1",
  mgr: "TEST-MGR-1", // مدير قسم A
  mgr2: "TEST-MGR-2", // مدير قسم B
  r1: "TEST-REQ-1", // طلب في قسم A
  r2: "TEST-REQ-2", // طلب في قسم B
};

async function makeUser(
  id: string,
  role: string,
  permissions: string[],
  password: string,
  department: string | null = null,
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
      department,
      isActive: true,
    },
    update: {
      passwordHash,
      role: role as never,
      permissions: JSON.stringify(permissions),
      department,
      isActive: true,
    },
  });
}

async function makeRequest(id: string, employeeId: string, department = DEPT_A) {
  await prisma.medicalRequest.upsert({
    where: { id },
    create: {
      id,
      employeeId,
      employeeName: employeeId,
      financialNumber: "0000",
      department,
      reason: "سبب اختبار",
      status: "pending",
    },
    update: { status: "pending", department },
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
  await makeUser(ids.emp1, "employee", ["create_request", "view_own_requests"], "Emp1Pass!!", DEPT_A);
  await makeUser(ids.emp2, "employee", ["create_request", "view_own_requests"], "Emp2Pass!!", DEPT_B);
  await makeUser(ids.emp3, "employee", ["create_request", "view_own_requests"], "Emp3Pass!!", DEPT_A);
  await makeUser(ids.admin, "super_admin", ["all"], "AdminPass!!", null);
  await makeUser(ids.mgr, "manager", ["approve_request", "reject_request"], "MgrPass!!!", DEPT_A);
  await makeUser(ids.mgr2, "manager", ["approve_request", "reject_request"], "Mgr2Pass!!", DEPT_B);
  await makeRequest(ids.r1, ids.emp1, DEPT_A);
  await makeRequest(ids.r2, ids.emp2, DEPT_B);
});

after(async () => {
  const testUsers = [ids.emp1, ids.emp2, ids.emp3, ids.admin, ids.mgr, ids.mgr2];
  // طلبات emp3 اتعملت عبر الـ API بـ ids مولّدة — بنمسحها بالموظف مش بالـ id.
  const emp3Requests = await prisma.medicalRequest.findMany({
    where: { employeeId: ids.emp3 },
    select: { id: true },
  });
  const requestIds = [ids.r1, ids.r2, ...emp3Requests.map((r) => r.id)];

  await prisma.requestTimelineEvent.deleteMany({ where: { requestId: { in: requestIds } } });
  await prisma.notification.deleteMany({ where: { requestId: { in: requestIds } } });
  await prisma.auditLog.deleteMany({
    where: { OR: [{ entityId: { in: requestIds } }, { userId: { in: testUsers } }] },
  });
  await prisma.medicalRequest.deleteMany({ where: { id: { in: requestIds } } });
  await prisma.user.deleteMany({
    where: { OR: [{ id: { in: testUsers } }, { username: "weak-pass-user" }] },
  });
  await rm(env.UPLOADS_DIR, { recursive: true, force: true });
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

test("فصل الإدارات: المدير يشوف طلبات إدارته فقط", async () => {
  const mgrToken = (await login(ids.mgr, "MgrPass!!!")).json().token;

  const list = await app.inject({ method: "GET", url: "/requests", headers: auth(mgrToken) });
  assert.equal(list.statusCode, 200);
  const rows = list.json() as Array<{ id: string; department: string }>;

  assert.ok(rows.some((r) => r.id === ids.r1), "المدير يشوف طلب إدارته");
  assert.ok(!rows.some((r) => r.id === ids.r2), "المدير ما يشوفش طلب إدارة تانية");
  assert.ok(rows.every((r) => r.department === DEPT_A), "كل الطلبات المرجّعة من إدارة المدير");
});

test("عزل الإدارات: مدير إدارة تانية ممنوع يشوف/يعتمد طلب برّه إدارته", async () => {
  const mgr2Token = (await login(ids.mgr2, "Mgr2Pass!!")).json().token;

  // r1 في قسم A، ومدير2 في قسم B → ممنوع تمامًا (قراءة وكتابة)
  const view = await app.inject({ method: "GET", url: `/requests/${ids.r1}`, headers: auth(mgr2Token) });
  assert.equal(view.statusCode, 403, "مدير إدارة تانية ممنوع يشوف الطلب");

  const approve = await app.inject({
    method: "POST",
    url: `/requests/${ids.r1}/transition`,
    headers: auth(mgr2Token),
    payload: { status: "approved", note: "محاولة اعتماد برّه الإدارة" },
  });
  assert.equal(approve.statusCode, 403, "مدير إدارة تانية ممنوع يعتمد الطلب");
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

test("regular employee cannot get PII from lookup endpoint", async () => {
  const loginRes = await login(ids.emp1, "Emp1Pass!!");
  assert.equal(loginRes.statusCode, 200);

  const token = loginRes.json().token;

  const res = await app.inject({
    method: "GET",
    url: "/users/lookup",
    headers: auth(token),
  });

  assert.equal(res.statusCode, 200);

  const users = res.json() as Array<Record<string, unknown>>;

  assert.ok(Array.isArray(users));

  for (const user of users) {
    assert.equal("nationalId" in user, false);
    assert.equal("phone" in user, false);
    assert.equal("workPlace" in user, false);
    assert.equal("workType" in user, false);
  }
});

// ─── إنشاء الطلبات: الـ id من السيرفر وقواعد العمل على السيرفر ───────────

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    employeeId: ids.emp3,
    employeeName: ids.emp3,
    financialNumber: "0003",
    department: DEPT_A,
    reason: "سبب اختبار قواعد الإنشاء",
    serviceType: "checkup",
    requestType: "normal",
    ...overrides,
  };
}

let emp3RequestId = ""; // بيتظبط في أول اختبار وبيستخدم في اختبارات المرفقات

test("إنشاء طلب: السيرفر يولّد الـ id ويتجاهل أي id من العميل", async () => {
  const token = (await login(ids.emp3, "Emp3Pass!!")).json().token;

  const res = await app.inject({
    method: "POST",
    url: "/requests",
    headers: auth(token),
    payload: { ...createPayload(), id: "HACKED-ID-123" },
  });
  assert.equal(res.statusCode, 201);
  const created = res.json();
  assert.notEqual(created.id, "HACKED-ID-123", "الـ id المزروع من العميل بيتتجاهل");
  assert.ok(created.id.length >= 32, "الـ id uuid مولّد على السيرفر");
  assert.equal(created.status, "pending", "الحالة بيحددها السيرفر");
  emp3RequestId = created.id;
});

test("قاعدة عمل: ممنوع طلب جديد وفيه طلب مفتوح (409)", async () => {
  const token = (await login(ids.emp3, "Emp3Pass!!")).json().token;

  const res = await app.inject({
    method: "POST",
    url: "/requests",
    headers: auth(token),
    payload: createPayload(),
  });
  assert.equal(res.statusCode, 409, "الطلب المفتوح بيمنع إنشاء طلب جديد");
});

// ─── المرفقات: رفع حقيقي بفحص نوع الملف الفعلي وقيود الوصول ─────────────

function multipartPayload(filename: string, contentType: string, content: Buffer) {
  const boundary = "----asroc-test-boundary";
  return {
    payload: Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
          `content-disposition: form-data; name="file"; filename="${filename}"\r\n` +
          `content-type: ${contentType}\r\n\r\n`,
      ),
      content,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01,
]);

test("مرفقات: رفع PNG صالح ينجح وتنزيله يرجع نفس المحتوى", async () => {
  const token = (await login(ids.emp3, "Emp3Pass!!")).json().token;
  const { payload, contentType } = multipartPayload("روشتة.png", "image/png", PNG_BYTES);

  const uploaded = await app.inject({
    method: "POST",
    url: `/requests/${emp3RequestId}/attachments`,
    headers: { ...auth(token), "content-type": contentType },
    payload,
  });
  assert.equal(uploaded.statusCode, 201);
  const attachment = uploaded.json();
  assert.equal(attachment.fileType, "image/png", "النوع من الـ magic bytes مش من الامتداد");
  assert.equal(attachment.fileSize, PNG_BYTES.length);

  const download = await app.inject({
    method: "GET",
    url: `/requests/${emp3RequestId}/attachments/${attachment.id}`,
    headers: auth(token),
  });
  assert.equal(download.statusCode, 200);
  assert.ok(download.rawPayload.equals(PNG_BYTES), "المحتوى المنزّل مطابق للمرفوع");
});

test("مرفقات: ملف بامتداد png ومحتوى مش صورة بيترفض (400)", async () => {
  const token = (await login(ids.emp3, "Emp3Pass!!")).json().token;
  const fakeImage = Buffer.from("MZ this is actually an executable, not an image");
  const { payload, contentType } = multipartPayload("virus.png", "image/png", fakeImage);

  const res = await app.inject({
    method: "POST",
    url: `/requests/${emp3RequestId}/attachments`,
    headers: { ...auth(token), "content-type": contentType },
    payload,
  });
  assert.equal(res.statusCode, 400, "الفحص بالـ magic bytes بيرفض المحتوى المزيف");
});

test("مرفقات: مدير إدارة تانية ممنوع يرفع على الطلب (403)", async () => {
  const token = (await login(ids.mgr2, "Mgr2Pass!!")).json().token;
  const { payload, contentType } = multipartPayload("scan.png", "image/png", PNG_BYTES);

  const res = await app.inject({
    method: "POST",
    url: `/requests/${emp3RequestId}/attachments`,
    headers: { ...auth(token), "content-type": contentType },
    payload,
  });
  assert.equal(res.statusCode, 403, "قيود فصل الإدارات سارية على المرفقات");
});

test("قاعدة عمل: حد الكشوفات الشهرية بيتطبق على السيرفر (400)", async () => {
  // نقفل طلب emp3 المفتوح ونزرع 3 كشوفات مكتملة الشهر ده مباشرةً في الداتابيز.
  await prisma.medicalRequest.update({
    where: { id: emp3RequestId },
    data: { status: "cancelled" },
  });
  for (let i = 1; i <= 3; i++) {
    await prisma.medicalRequest.create({
      data: {
        employeeId: ids.emp3,
        employeeName: ids.emp3,
        financialNumber: "0003",
        department: DEPT_A,
        reason: `كشف مكتمل ${i}`,
        serviceType: "checkup",
        requestType: "normal",
        status: "completed",
      },
    });
  }

  const token = (await login(ids.emp3, "Emp3Pass!!")).json().token;
  const res = await app.inject({
    method: "POST",
    url: "/requests",
    headers: auth(token),
    payload: createPayload(),
  });
  assert.equal(res.statusCode, 400, "3 كشوفات مكتملة بتستهلك الحد الشهري");

  // الطوارئ مستثناة من الحد — لكن بتتحسب طلب مفتوح، فبننضف بعدها.
  const emergency = await app.inject({
    method: "POST",
    url: "/requests",
    headers: auth(token),
    payload: createPayload({ requestType: "emergency" }),
  });
  assert.equal(emergency.statusCode, 201, "الطوارئ مش محسوبة على الحد الشهري");
});

// ─── سياسة الباسورد (من packages/shared/policy) ─────────────────────────

test("سياسة الباسورد: إنشاء مستخدم بباسورد ضعيف يفشل (400)", async () => {
  const token = (await login(ids.admin, "AdminPass!!")).json().token;

  const weak = await app.inject({
    method: "POST",
    url: "/users",
    headers: auth(token),
    payload: { username: "weak-pass-user", password: "1234", name: "ضعيف", role: "employee" },
  });
  assert.equal(weak.statusCode, 400, "أقل من 8 أحرف مرفوض");

  const noDigit = await app.inject({
    method: "POST",
    url: "/users",
    headers: auth(token),
    payload: { username: "weak-pass-user", password: "abcdefgh", name: "ضعيف", role: "employee" },
  });
  assert.equal(noDigit.statusCode, 400, "من غير رقم مرفوض");
});

test("سياسة الباسورد: تغيير الباسورد لواحد ضعيف يفشل (400)", async () => {
  const token = (await login(ids.emp3, "Emp3Pass!!")).json().token;
  const res = await app.inject({
    method: "POST",
    url: "/auth/change-password",
    headers: auth(token),
    payload: { currentPassword: "Emp3Pass!!", newPassword: "abc" },
  });
  assert.equal(res.statusCode, 400);
});

// ─── الأقسام (A7) ────────────────────────────────────────────────────────

test("الأقسام: /departments بيرجع القسم باسمه الحقيقي ومعاه اسم المدير", async () => {
  await prisma.department.upsert({
    where: { name: DEPT_A },
    create: { name: DEPT_A, managerFinancialNumber: "MGR-FIN-1" },
    update: { managerFinancialNumber: "MGR-FIN-1" },
  });
  await prisma.user.update({
    where: { id: ids.mgr },
    data: { financialNumber: "MGR-FIN-1" },
  });

  const token = (await login(ids.emp3, "Emp3Pass!!")).json().token;
  const res = await app.inject({ method: "GET", url: "/departments", headers: auth(token) });
  assert.equal(res.statusCode, 200);

  const rows = res.json() as Array<{ name: string; managerName: string | null }>;
  const dept = rows.find((d) => d.name === DEPT_A);
  assert.ok(dept, "القسم موجود بالاسم الحقيقي (مش اسم المدير)");
  assert.equal(dept!.managerName, ids.mgr, "اسم المدير بيتكمّل من جدول المستخدمين");

  await prisma.department.deleteMany({ where: { name: DEPT_A } });
});
