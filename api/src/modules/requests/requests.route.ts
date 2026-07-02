import type { FastifyInstance } from "fastify";

import { forbidden } from "../../lib/httpError.js";
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
} from "./requests.service.js";
import { statusPermission } from "./requests.workflow.js";

function hasAnyPermission(user: any, perms: string[]) {
  return user.permissions.includes("all") || perms.some((perm) => user.permissions.includes(perm));
}

function canViewAllRequests(user: any) {
  if (user.role === "super_admin") return true;
  return hasAnyPermission(user, [
    "approve_request",
    "reject_request",
    "postpone_request",
    "security_check_out",
    "security_check_in",
    "diagnose_patient",
    "create_prescription",
    "create_referral",
    "create_sick_leave",
    "recommend_monthly_treatment",
    "dispense_prescription",
    "manage_inventory",
    "manage_pharmacy",
    "approve_referral",
    "manage_monthly_treatment",
    "manage_pensioners",
    "manage_contracts",
    "manage_referrals",
    "dispense_regular_treatment",
    "dispense_monthly_treatment",
    "view_reports",
    "print_documents",
    "view_audit_log",
    "manage_system",
  ]);
}

function canModifyRequest(user: any, request: any, fields: Record<string, unknown>) {
  if (user.permissions.includes("all") || user.permissions.includes("manage_system")) return true;

  const closedStatuses = [
    "completed",
    "rejected",
    "cancelled",
    "monthly_rejected",
    "monthly_completed",
  ];

  if (closedStatuses.includes(request.status)) {
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
  // كل الـ routes محتاجة تسجيل دخول
  const auth = { preHandler: [app.authenticate] };

  // GET /requests?employeeId=&status=
  app.get("/", auth, async (req, reply) => {
    const query = listQuerySchema.parse(req.query);
    const user = req.user as any;

    if (!canViewAllRequests(user)) {
      if (!user.permissions.includes("view_own_requests")) {
        return reply.code(403).send({ error: "Forbidden", message: "صلاحية غير كافية لعرض الطلبات" });
      }

      if (query.employeeId && query.employeeId !== user.sub) {
        return reply.code(403).send({ error: "Forbidden", message: "غير مسموح بعرض طلبات موظف آخر" });
      }

      query.employeeId = user.sub;
    }

    return listRequests(query);
  });

  // GET /requests/:id
  app.get<{ Params: { id: string } }>("/:id", auth, async (req, reply) => {
    const request = await getRequest(req.params.id);
    const user = req.user as any;

    if (request.employeeId !== user.sub && !canViewAllRequests(user)) {
      return reply.code(403).send({ error: "Forbidden", message: "غير مسموح بعرض هذا الطلب" });
    }

    return request;
  });

  // POST /requests
  // بيسمح لصاحب create_request (الموظف لنفسه) أو manage_system/all (إنشاء نيابةً — طوارئ).
  app.post("/", auth, async (req, reply) => {
    const user = req.user as any;
    const canCreateOnBehalf =
      user.permissions.includes("all") || user.permissions.includes("manage_system");
    const canCreate = canCreateOnBehalf || user.permissions.includes("create_request");
    if (!canCreate) {
      return reply
        .code(403)
        .send({ error: "Forbidden", message: "صلاحية غير كافية لإنشاء طلب" });
    }

    const body = createRequestSchema.parse(req.body);

    // قفل الهوية: الموظف العادي ما يقدرش ينشئ طلب باسم حد تاني.
    // الإنشاء نيابةً (طوارئ) مسموح بس لمن يملك manage_system/all.
    const identity = canCreateOnBehalf
      ? { employeeId: body.employeeId, employeeName: body.employeeName }
      : { employeeId: user.sub, employeeName: user.name };

    const created = await createRequest(
      { ...body, ...identity },
      { id: req.user.sub, name: req.user.name, role: req.user.role },
    );
    return reply.code(201).send(created);
  });

  // PATCH /requests/:id  — تحديث حقول (تشخيص/روشتة/إحالة/إجازة...)
  app.patch<{ Params: { id: string } }>("/:id", auth, async (req, reply) => {
    const body = updateRequestSchema.parse(req.body);
    const user = req.user as any;
    const request = await getRequest(req.params.id);

    if (!canModifyRequest(user, request, body)) {
      return reply.code(403).send({ error: "Forbidden", message: "صلاحية غير كافية لتعديل هذا الطلب" });
    }

    return updateRequest(req.params.id, body, {
      id: user.sub,
      name: user.name,
      role: user.role,
    });
  });

  // POST /requests/:id/transition  { status, note? }
  app.post<{ Params: { id: string } }>("/:id/transition", auth, async (req) => {
    const { status, note } = transitionSchema.parse(req.body);

    // الصلاحية المطلوبة للتحويل ده
    const perm = statusPermission[status];
    if (!perm) {
      if (!req.user.permissions.includes("all") && !req.user.permissions.includes("manage_system")) {
        throw forbidden("صلاحية غير كافية لهذا الإجراء (افتراضي ممنوع)");
      }
    } else if (
      !req.user.permissions.includes("all") &&
      !req.user.permissions.includes(perm)
    ) {
      throw forbidden("صلاحية غير كافية لهذا الإجراء");
    }

    return transitionRequest(req.params.id, status, note, {
      id: req.user.sub,
      name: req.user.name,
      role: req.user.role,
    });
  });
}
