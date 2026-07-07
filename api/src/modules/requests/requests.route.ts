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
} from "./requests.service.js";
import { statusPermission } from "./requests.workflow.js";
import type { Permission, UserRole } from "@asroc/shared/roles.js";

// ✅ نوع صريح بدل any
interface RequestUser {
  sub: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
}

function hasAnyPermission(user: RequestUser, perms: Permission[]) {
  if (user.permissions.includes("all")) return true;
  return perms.some((perm) => user.permissions.includes(perm));
}

// ✅ الصلاحيات اللي فعلاً بتخليك تشوف كل الطلبات
const VIEW_ALL_PERMISSIONS: Permission[] = [
  "approve_request",
  "reject_request",
  "postpone_request",
  "security_check_out",
  "security_check_in",
  "diagnose_patient",
  "dispense_prescription",
  "manage_inventory",
  "manage_pharmacy",
  "manage_monthly_treatment",
  "manage_pensioners",
  "manage_contracts",
  "manage_referrals",
  "approve_referral",
  "dispense_regular_treatment",
  "dispense_monthly_treatment",
  "manage_system",
];

function canViewAllRequests(user: RequestUser): boolean {
  if (user.role === "super_admin") return true;
  return hasAnyPermission(user, VIEW_ALL_PERMISSIONS);
}

function canModifyRequest(user: RequestUser, request: any, fields: Record<string, unknown>): boolean {
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
  const auth = { preHandler: [app.authenticate] };

  // GET /requests
  app.get("/", auth, async (req, reply) => {
    const query = listQuerySchema.parse(req.query);
    const user = req.user as RequestUser;

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
    const user = req.user as RequestUser;

    if (!request) {
      return reply.code(404).send({ error: "Not Found", message: "الطلب غير موجود" });
    }

    if (request.employeeId !== user.sub && !canViewAllRequests(user)) {
      return reply.code(403).send({ error: "Forbidden", message: "غير مسموح بعرض هذا الطلب" });
    }

    return request;
  });

  // POST /requests
  app.post("/", auth, async (req, reply) => {
    const user = req.user as RequestUser;
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
    const user = req.user as RequestUser;
    const request = await getRequest(req.params.id);

    if (!request) {
      return reply.code(404).send({ error: "Not Found", message: "الطلب غير موجود" });
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
    const user = req.user as RequestUser;

    // ✅ تحقق إن الطلب موجود
    const request = await getRequest(req.params.id);
    if (!request) {
      return reply.code(404).send({ error: "Not Found", message: "الطلب غير موجود" });
    }

    // ✅ تحقق الصلاحية
    const perm = statusPermission[status];

    if (!perm) {
      // حالة مش معرّفة في الـ mapping — ممنوعة حتى لـ super_admin
      return reply.code(400).send({
        error: "Bad Request",
        message: `حالة الانتقال "${status}" غير معرّفة أو غير مسموحة`,
      });
    }

    if (
      !user.permissions.includes("all") &&
      !user.permissions.includes(perm)
    ) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "صلاحية غير كافية لهذا الإجراء",
      });
    }

    return transitionRequest(req.params.id, status, note, {
      id: user.sub,
      name: user.name,
      role: user.role,
    });
  });
}