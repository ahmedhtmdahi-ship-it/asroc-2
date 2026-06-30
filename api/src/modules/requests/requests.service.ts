import { prisma } from "../../db/prisma.js";
import { badRequest, notFound } from "../../lib/httpError.js";
import {
  canMove,
  statusLabels,
  statusTimestampField,
  type RequestStatus,
} from "./requests.workflow.js";
import type { CreateRequestInput, ListQuery } from "./requests.schema.js";

interface Actor {
  id: string;
  name: string;
  role: string;
}

export async function listRequests(query: ListQuery) {
  return prisma.medicalRequest.findMany({
    where: {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRequest(id: string) {
  const request = await prisma.medicalRequest.findUnique({
    where: { id },
    include: {
      medications: true,
      timeline: { orderBy: { timestamp: "asc" } },
      attachments: true,
      referral: true,
    },
  });
  if (!request) throw notFound("الطلب غير موجود");
  return request;
}

export async function createRequest(input: CreateRequestInput, actor: Actor) {
  const status: RequestStatus =
    input.serviceType === "monthly_treatment" ? "pending_monthly_doctor" : "pending";

  const created = await prisma.medicalRequest.create({
    data: {
      ...input,
      status,
      createdBy: actor.id,
      timeline: {
        create: [
          {
            status,
            userId: actor.id,
            userName: actor.name,
            userRole: actor.role,
            notes: input.notes ?? null,
          },
        ],
      },
    },
    include: { timeline: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      userName: actor.name,
      action: "CREATE_REQUEST",
      entityType: "MedicalRequest",
      entityId: created.id,
    },
  });

  return created;
}

export async function transitionRequest(
  requestId: string,
  nextStatus: RequestStatus,
  note: string | undefined,
  actor: Actor,
) {
  const current = await prisma.medicalRequest.findUnique({ where: { id: requestId } });
  if (!current) throw notFound("الطلب غير موجود");

  if (!canMove(current.status as RequestStatus, nextStatus)) {
    throw badRequest(`تحويل غير صالح: ${current.status} → ${nextStatus}`);
  }

  // كل التغييرات في معاملة واحدة — يا كلها تنجح يا تترجع.
  return prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = { status: nextStatus };
    const tsField = statusTimestampField[nextStatus];
    if (tsField) updateData[tsField] = new Date();

    const updated = await tx.medicalRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    await tx.requestTimelineEvent.create({
      data: {
        requestId,
        status: nextStatus,
        userId: actor.id,
        userName: actor.name,
        userRole: actor.role,
        notes: note ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        userName: actor.name,
        action: "MOVE_REQUEST_STATUS",
        entityType: "MedicalRequest",
        entityId: requestId,
        details: { from: current.status, to: nextStatus, note: note ?? null },
      },
    });

    await tx.notification.create({
      data: {
        userId: current.employeeId,
        title: "تحديث حالة الطلب",
        message: `تم تحديث حالة طلبك إلى: ${statusLabels[nextStatus]}`,
        requestId,
      },
    });

    if (nextStatus === "checked_out" || nextStatus === "returned") {
      await tx.securityLog.create({
        data: {
          requestId,
          employeeId: current.employeeId,
          employeeName: current.employeeName,
          type: nextStatus === "checked_out" ? "check_out" : "check_in",
          officerId: actor.id,
          officerName: actor.name,
        },
      });
    }

    return updated;
  });
}
