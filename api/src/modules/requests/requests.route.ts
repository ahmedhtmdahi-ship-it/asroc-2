import type { FastifyInstance } from "fastify";

import { requirePermission } from "../../middleware/requirePermission.js";
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

export async function requestRoutes(app: FastifyInstance) {
  // كل الـ routes محتاجة تسجيل دخول
  const auth = { preHandler: [app.authenticate] };

  // GET /requests?employeeId=&status=
  app.get("/", auth, async (req) => {
    const query = listQuerySchema.parse(req.query);
    return listRequests(query);
  });

  // GET /requests/:id
  app.get<{ Params: { id: string } }>("/:id", auth, async (req) => {
    return getRequest(req.params.id);
  });

  // POST /requests
  app.post(
    "/",
    { preHandler: [app.authenticate, requirePermission("create_request")] },
    async (req, reply) => {
      const body = createRequestSchema.parse(req.body);
      const created = await createRequest(body, {
        id: req.user.sub,
        name: req.user.name,
        role: req.user.role,
      });
      return reply.code(201).send(created);
    },
  );

  // PATCH /requests/:id  — تحديث حقول (تشخيص/روشتة/إحالة/إجازة...)
  app.patch<{ Params: { id: string } }>("/:id", auth, async (req) => {
    const body = updateRequestSchema.parse(req.body);
    return updateRequest(req.params.id, body, {
      id: req.user.sub,
      name: req.user.name,
      role: req.user.role,
    });
  });

  // POST /requests/:id/transition  { status, note? }
  app.post<{ Params: { id: string } }>("/:id/transition", auth, async (req) => {
    const { status, note } = transitionSchema.parse(req.body);

    // الصلاحية المطلوبة للتحويل ده
    const perm = statusPermission[status];
    if (
      perm &&
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
