import type { FastifyInstance } from "fastify";

import { forbidden, notFound } from "../../lib/httpError.js";
import {
  createRequestSchema,
  listQuerySchema,
  transitionSchema,
  updateRequestSchema,
} from "./requests.schema.js";
import {
  createRequest,
  getRequest,
  listRequests,
  transitionRequest,
  updateRequest,
  type ListFilter,
} from "./requests.service.js";
import { statusPermission, closedRequestStatuses } from "./requests.workflow.js";
// helpers الهوية وفصل الإدارات — مشتركة مع route المرفقات.
import {
  canReachRequest,
  isDepartmentManager,
  isFullViewer,
  resolveUser,
  type RequestUser,
} from "./requests.access.js";

function canModifyRequest(user: RequestUser, request: any, fields: Record<string, unknown>): boolean {
  if (user.permissions.includes("all") || user.permissions.includes("manage_system")) return true;

  // مصدر واحد لقائمة الحالات المغلقة (بدل تكرارها هنا) — من packages/shared عبر workflow.
  if ((closedRequestStatuses as string[]).includes(request.status)) {
    return false;
  }

  const referralData = fields.referralData as { status?: string } | undefined;
  const hasDiagnosisFields =
    fields.doctorDiagnosis !== undefined ||
    fields.medications !== undefined ||
    fields.sickLeaveDays !== undefined ||
    fields.sickLeaveReason !== undefined;

  if (referralData) {
    if (referralData.status === "approved" || referralData.status === "rejected") {
      return user.permissions.includes("approve_referral") || user.permissions.includes("manage_referrals");
    }
    return user.permissions.includes("create_referral") || user.permissions.includes("diagnose_patient");
  }

  if (hasDiagnosisFields) {
    return user.permissions.includes("diagnose_patient");
  }

  return false;
}

export async function requestRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  // GET /requests — الرؤية مقيّدة حسب الدور (فصل الإدارات):
  //  • super_admin / الطبية / الأدوار الخدمية → كل الإدارات
  //  • المدير (manager/office_manager) → إدارته فقط
  //  • الموظف → طلباته فقط
  app.get("/", auth, async (req, reply) => {
    const query = listQuerySchema.parse(req.query);
    const user = resolveUser(req);

    const filter: ListFilter = {};
    if (query.status) filter.status = query.status;

    if (isFullViewer(user)) {
      if (query.employeeId) filter.employeeId = query.employeeId;
      return listRequests(filter);
    }

    if (isDepartmentManager(user)) {
      // Fail-closed: مدير من غير إدارة محددة ما يشوفش أي حاجة.
      if (!user.department) {
        return reply
          .code(403)
          .send({ error: "Forbidden", message: "لم يتم تحديد إدارة لهذا المدير" });
      }
      // تقييد على مستوى السيرفر — العميل لا يقدر يتخطّاه.
      filter.department = user.department;
      if (query.employeeId) filter.employeeId = query.employeeId;
      return listRequests(filter);
    }

    if (user.permissions.includes("view_own_requests")) {
      if (query.employeeId && query.employeeId !== user.sub) {
        return reply
          .code(403)
          .send({ error: "Forbidden", message: "غير مسموح بعرض طلبات موظف آخر" });
      }
      filter.employeeId = user.sub;
      return listRequests(filter);
    }

    return reply
      .code(403)
      .send({ error: "Forbidden", message: "صلاحية غير كافية لعرض الطلبات" });
  });

  // GET /requests/:id — نفس قيد الإدارة على الطلب المفرد.
  app.get<{ Params: { id: string } }>("/:id", auth, async (req, reply) => {
    const request = await getRequest(req.params.id);
    const user = resolveUser(req);

    if (!canReachRequest(user, request)) {
      return reply.code(403).send({ error: "Forbidden", message: "غير مسموح بعرض هذا الطلب" });
    }

    return request;
  });

  // POST /requests
  app.post("/", auth, async (req, reply) => {
    const user = resolveUser(req);
    const canCreateOnBehalf =
      user.permissions.includes("all") || user.permissions.includes("manage_system");
    const canCreate = canCreateOnBehalf || user.permissions.includes("create_request");
    if (!canCreate) {
      return reply
        .code(403)
        .send({ error: "Forbidden", message: "صلاحية غير كافية لإنشاء طلب" });
    }

    const body = createRequestSchema.parse(req.body);

    const identity = canCreateOnBehalf
      ? { employeeId: body.employeeId, employeeName: body.employeeName }
      : { employeeId: user.sub, employeeName: user.name };

    const created = await createRequest(
      { ...body, ...identity },
      { id: user.sub, name: user.name, role: user.role },
    );
    return reply.code(201).send(created);
  });

  // PATCH /requests/:id
  app.patch<{ Params: { id: string } }>("/:id", auth, async (req, reply) => {
    const body = updateRequestSchema.parse(req.body);
    const user = resolveUser(req);
    const request = await getRequest(req.params.id);

    // قيد الإدارة أولاً: المدير لا يعدّل طلبًا خارج إدارته.
    if (!canReachRequest(user, request)) {
      return reply.code(403).send({ error: "Forbidden", message: "غير مسموح بتعديل هذا الطلب" });
    }

    if (!canModifyRequest(user, request, body)) {
      return reply.code(403).send({ error: "Forbidden", message: "صلاحية غير كافية لتعديل هذا الطلب" });
    }

    return updateRequest(req.params.id, body, {
      id: user.sub,
      name: user.name,
      role: user.role,
    });
  });

  // POST /requests/:id/transition
  app.post<{ Params: { id: string } }>("/:id/transition", auth, async (req, reply) => {
    const { status, note } = transitionSchema.parse(req.body);
    const user = resolveUser(req);

    // ✅ تحقق إن الطلب موجود (getRequest بترمي 404 لو مش موجود)
    const request = await getRequest(req.params.id);

    // تجاوز السوبر أدمن — بالدور أو بصلاحية "all" (نفس منطق middleware/requirePermission).
    const isSuperAdmin =
      user.role === "super_admin" || user.permissions.includes("all");

    // الصلاحية المطلوبة لهذا التحويل. undefined = مفيش صلاحية إضافية مطلوبة
    // (يكفي إن المستخدم يقدر يوصل للطلب) — زي ما هو موثّق في workflow.ts.
    // الانتقال نفسه محروس بـ canMove داخل transitionRequest (بيرمي 400 لو غير صالح)
    // وبـ transitionSchema (status مقيّد بالـ enum)، فمفيش انتقال حر.
    const perm = statusPermission[status];

    if (perm && !isSuperAdmin && !user.permissions.includes(perm)) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "صلاحية غير كافية لهذا الإجراء",
      });
    }

    // الإلغاء حالة خاصة: موديل الصلاحية الواحدة مش بيعبّر عن "المالك أو المدير".
    // يُسمح فقط لصاحب الطلب أو لمن يملك صلاحية اعتماد/رفض/إدارة — عشان دور خدمي
    // cross-department (طبيب/صيدلية/أمن) ما يقدرش يلغي طلب pending لموظف تاني.
    if (status === "cancelled" && !isSuperAdmin) {
      const isOwner = request.employeeId === user.sub;
      const canCancelForOthers =
        user.permissions.includes("approve_request") ||
        user.permissions.includes("reject_request") ||
        user.permissions.includes("manage_system");
      if (!isOwner && !canCancelForOthers) {
        return reply.code(403).send({
          error: "Forbidden",
          message: "غير مسموح بإلغاء هذا الطلب",
        });
      }
    }

    // قيد الإدارة: المدير يعتمد/يرفض طلبات إدارته فقط (الأدوار الخدمية والموظف على طلبه).
    if (!canReachRequest(user, request)) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "غير مسموح بتنفيذ إجراء على طلب خارج نطاقك",
      });
    }

    return transitionRequest(req.params.id, status, note, {
      id: user.sub,
      name: user.name,
      role: user.role,
    });
  });
}