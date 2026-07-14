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
  // فاعلو الـ workflow لاختبار المسار الكامل عبر الـ API (كل واحد بصلاحياته الحقيقية).
  wsec: "TEST-WF-SEC", // أمن (خروج/عودة/إغلاق)
  wdoc: "TEST-WF-DOC", // طبيب (تشخيص/روشتة)
  wpharm: "TEST-WF-PHARM", // صيدلية (صرف)
  wpension: "TEST-WF-PENSION", // معاشات (مسار العلاج الشهري كامل)
  wemp: "TEST-WF-EMP", // موظف مسار الكشف الكامل
  wempM: "TEST-WF-EMP-M", // موظف مسار الشهري
  wempX: "TEST-WF-EMP-X", // موظف اختبار الإلغاء
};

// أدوية اختبار لبحث/حد نقطة GET /medicines — بنمسحها في after.
const testMedicineIds = ["TEST-MED-1", "TEST-MED-2", "TEST-MED-3"];

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
  // فاعلو الـ workflow — أدوار خدمية cross-department + موظفون للمسارات الكاملة.
  await makeUser(ids.wsec, "security", ["security_check_out", "security_check_in"], "WfSecPass!!", null);
  await makeUser(ids.wdoc, "doctor", ["diagnose_patient", "create_prescription"], "WfDocPass!!", null);
  await makeUser(ids.wpharm, "pharmacy", ["dispense_prescription"], "WfPharmPass!!", null);
  await makeUser(
    ids.wpension,
    "pension_admin",
    ["recommend_monthly_treatment", "manage_monthly_treatment", "dispense_monthly_treatment"],
    "WfPenPass!!",
    null,
  );
  await makeUser(ids.wemp, "employee", ["create_request", "view_own_requests"], "WfEmpPass!!", DEPT_A);
  await makeUser(ids.wempM, "employee", ["create_request", "view_own_requests"], "WfEmpMPass!!", DEPT_A);
  await makeUser(ids.wempX, "employee", ["create_request", "view_own_requests"], "WfEmpXPass!!", DEPT_A);
  await makeRequest(ids.r1, ids.emp1, DEPT_A);
  await makeRequest(ids.r2, ids.emp2, DEPT_B);

  // أدوية اختبار لبحث نقطة /medicines: صنفان نشطان بالاسم "ZZTESTMED" + صنف مُعطّل.
  // نمسح أولاً (تشغيل سابق اتقطع) عشان الإعداد يفضل idempotent زي باقي البيانات.
  await prisma.medicine.deleteMany({ where: { id: { in: testMedicineIds } } });
  await prisma.medicine.createMany({
    data: [
      { id: testMedicineIds[0], name: "ZZTESTMED Paracetamol", unit: "قرص", isActive: true },
      { id: testMedicineIds[1], name: "ZZTESTMED Ibuprofen", unit: "قرص", isActive: true },
      { id: testMedicineIds[2], name: "ZZTESTMED Aspirin", unit: "قرص", isActive: false },
    ],
  });
});

after(async () => {
  const testUsers = [
    ids.emp1, ids.emp2, ids.emp3, ids.admin, ids.mgr, ids.mgr2,
    ids.wsec, ids.wdoc, ids.wpharm, ids.wpension, ids.wemp, ids.wempM, ids.wempX,
  ];
  // الطلبات اللي اتعملت عبر الـ API بـ ids مولّدة — بنمسحها بالموظف مش بالـ id.
  const apiEmployees = [ids.emp3, ids.wemp, ids.wempM, ids.wempX];
  const apiRequests = await prisma.medicalRequest.findMany({
    where: { employeeId: { in: apiEmployees } },
    select: { id: true },
  });
  const requestIds = [ids.r1, ids.r2, ...apiRequests.map((r) => r.id)];

  await prisma.requestTimelineEvent.deleteMany({ where: { requestId: { in: requestIds } } });
  await prisma.notification.deleteMany({ where: { requestId: { in: requestIds } } });
  await prisma.auditLog.deleteMany({
    where: { OR: [{ entityId: { in: requestIds } }, { userId: { in: testUsers } }] },
  });
  await prisma.medicalRequest.deleteMany({ where: { id: { in: requestIds } } });
  await prisma.medicine.deleteMany({ where: { id: { in: testMedicineIds } } });
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
    // مش المفروض يكشف خريطة صلاحيات باقي المستخدمين لأي مستخدم مسجّل.
    assert.equal("permissions" in user, false);
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
  // زرع حالة تاريخية مباشرةً: قفل الطلب المفتوح + 3 كشوفات مكتملة الشهر ده.
  // ده إعداد بيانات (مش التفاف حول باگ) — مسارات completed/cancelled الحقيقية عبر الـ API
  // مغطّاة في اختبارات "المسار الكامل" و"الإلغاء عبر الـ API" فوق.
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

// ─── المسار الكامل عبر الـ API (بيكشف إن الطلب بيوصل completed فعلاً) ───────────
// الاختبارات دي بتسقط قبل إصلاح statusPermission (الـ API كان بيرفض
// completed/monthly_completed بـ 400 فالطلب بيعلق عند returned/monthly_dispensed)،
// وبتنجح بعده. كل خطوة بالفاعل وصلاحيته الحقيقية — مش super_admin بيتخطّى كله.

async function transition(token: string, id: string, status: string, note?: string) {
  return app.inject({
    method: "POST",
    url: `/requests/${id}/transition`,
    headers: auth(token),
    payload: { status, note },
  });
}

async function createRequestAs(
  token: string,
  employeeId: string,
  financialNumber: string,
  extra: Record<string, unknown>,
) {
  return app.inject({
    method: "POST",
    url: "/requests",
    headers: auth(token),
    payload: {
      employeeId,
      employeeName: employeeId,
      financialNumber,
      department: DEPT_A,
      reason: "اختبار مسار كامل",
      ...extra,
    },
  });
}

test("المسار الكامل للكشف: من pending حتى completed عبر الـ API", async () => {
  const empToken = (await login(ids.wemp, "WfEmpPass!!")).json().token;
  const created = await createRequestAs(empToken, ids.wemp, "0100", {
    serviceType: "checkup",
    requestType: "normal",
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().status, "pending");
  const reqId = created.json().id;

  const mgrToken = (await login(ids.mgr, "MgrPass!!!")).json().token;
  const secToken = (await login(ids.wsec, "WfSecPass!!")).json().token;
  const docToken = (await login(ids.wdoc, "WfDocPass!!")).json().token;
  const pharmToken = (await login(ids.wpharm, "WfPharmPass!!")).json().token;

  const steps: Array<[string, string]> = [
    [mgrToken, "approved"],
    [secToken, "checked_out"],
    [docToken, "in_diagnosis"],
    [docToken, "prescribed"],
    [pharmToken, "dispensed"],
    [secToken, "returned"],
    [secToken, "completed"], // ← الخطوة اللي كانت مكسورة (400) قبل الإصلاح
  ];
  for (const [token, status] of steps) {
    const res = await transition(token, reqId, status);
    assert.equal(res.statusCode, 200, `الانتقال إلى ${status} لازم ينجح`);
    assert.equal(res.json().status, status);
  }

  // بعد الإكمال الطلب بيتقفل → قاعدة "طلب مفتوح واحد" تتحرّر والموظف يقدر يعمل طلب جديد.
  const again = await createRequestAs(empToken, ids.wemp, "0100", {
    serviceType: "checkup",
    requestType: "normal",
  });
  assert.equal(again.statusCode, 201, "بعد الإكمال يقدر يعمل طلب جديد (مش محبوس)");
});

test("المسار الكامل للعلاج الشهري: حتى monthly_completed عبر الـ API", async () => {
  const empToken = (await login(ids.wempM, "WfEmpMPass!!")).json().token;
  const created = await createRequestAs(empToken, ids.wempM, "0200", {
    serviceType: "monthly_treatment",
    monthlyTreatmentType: "new",
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().status, "pending_monthly_doctor");
  const reqId = created.json().id;

  const penToken = (await login(ids.wpension, "WfPenPass!!")).json().token;
  const steps = [
    "monthly_approved",
    "monthly_ready_pharmacy",
    "monthly_dispensed",
    "monthly_completed", // ← الخطوة اللي كانت مكسورة (400) قبل الإصلاح
  ];
  for (const status of steps) {
    const res = await transition(penToken, reqId, status);
    assert.equal(res.statusCode, 200, `الانتقال إلى ${status} لازم ينجح`);
    assert.equal(res.json().status, status);
  }
});

test("الإلغاء عبر الـ API: صاحب الطلب يقدر، ودور خدمي cross-department ممنوع", async () => {
  const empToken = (await login(ids.wempX, "WfEmpXPass!!")).json().token;
  const created = await createRequestAs(empToken, ids.wempX, "0300", {
    serviceType: "checkup",
    requestType: "normal",
  });
  assert.equal(created.statusCode, 201);
  const reqId = created.json().id;

  // طبيب (cross-department، من غير approve/reject) ممنوع يلغي طلب موظف تاني.
  const docToken = (await login(ids.wdoc, "WfDocPass!!")).json().token;
  const denied = await transition(docToken, reqId, "cancelled");
  assert.equal(denied.statusCode, 403, "دور خدمي مش صاحب الطلب ممنوع يلغي");

  // صاحب الطلب يقدر يلغي طلبه.
  const ok = await transition(empToken, reqId, "cancelled");
  assert.equal(ok.statusCode, 200, "صاحب الطلب يقدر يلغي طلبه");
  assert.equal(ok.json().status, "cancelled");
});

test("سجل الأمن: ضابط الأمن يشوفه، والموظف العادي ممنوع", async () => {
  // ضابط أمن (security_check_in/out) لازم يوصل لسجل حركته — كان بيترفض قبل الإصلاح.
  const secToken = (await login(ids.wsec, "WfSecPass!!")).json().token;
  const ok = await app.inject({ method: "GET", url: "/security-logs", headers: auth(secToken) });
  assert.equal(ok.statusCode, 200, "ضابط الأمن يشوف سجل الحركة");
  assert.ok(Array.isArray(ok.json()));

  // موظف عادي (من غير أي صلاحية أمن/تدقيق) ممنوع.
  const empToken = (await login(ids.wemp, "WfEmpPass!!")).json().token;
  const denied = await app.inject({ method: "GET", url: "/security-logs", headers: auth(empToken) });
  assert.equal(denied.statusCode, 403, "الموظف العادي ممنوع من سجل الأمن");
});

test("GET /medicines: بحث + حد + activeOnly (وتوافق خلفي بدون باراميترات)", async () => {
  // أي مستخدم مسجّل يقدر يقرأ الكتالوج — بنستخدم موظف عادي.
  const token = (await login(ids.emp1, "Emp1Pass!!")).json().token;

  // توافق خلفي: بدون باراميترات بيرجّع الكل (فيهم أدوية الاختبار الثلاثة).
  const all = await app.inject({ method: "GET", url: "/medicines", headers: auth(token) });
  assert.equal(all.statusCode, 200);
  const allBody = all.json() as Array<{ id: string }>;
  assert.ok(Array.isArray(allBody));
  const testIdsFound = allBody.filter((m) => testMedicineIds.includes(m.id));
  assert.equal(testIdsFound.length, 3, "بدون فلتر لازم يرجّع أدوية الاختبار الثلاثة");

  // بحث بالاسم (contains) — الـ token فريد فبيرجّع الثلاثة بالظبط (نشط + مُعطّل).
  const search = await app.inject({
    method: "GET",
    url: "/medicines?search=ZZTESTMED",
    headers: auth(token),
  });
  assert.equal(search.statusCode, 200);
  const searchBody = search.json() as Array<{ id: string; name: string }>;
  assert.equal(searchBody.length, 3, "البحث بالاسم لازم يرجّع أدوية الاختبار بس");
  assert.ok(searchBody.every((m) => m.name.includes("ZZTESTMED")));

  // بحث أضيق — صنف واحد.
  const one = await app.inject({
    method: "GET",
    url: "/medicines?search=Paracetamol",
    headers: auth(token),
  });
  assert.equal(one.json().length, 1, "بحث أضيق لازم يرجّع صنف واحد");

  // activeOnly=true بيستبعد الصنف المُعطّل (Aspirin) → اتنين بس.
  const activeOnly = await app.inject({
    method: "GET",
    url: "/medicines?search=ZZTESTMED&activeOnly=true",
    headers: auth(token),
  });
  assert.equal(activeOnly.json().length, 2, "activeOnly لازم يستبعد الصنف المُعطّل");

  // limit بيحدّ عدد النتائج.
  const limited = await app.inject({
    method: "GET",
    url: "/medicines?search=ZZTESTMED&limit=1",
    headers: auth(token),
  });
  assert.equal(limited.json().length, 1, "limit لازم يحدّ عدد الصفوف المرجّعة");
});
