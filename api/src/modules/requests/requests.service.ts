import { prisma } from "../../db/prisma.js";
import { badRequest, notFound } from "../../lib/httpError.js";
import {
  canMove,
  statusLabels,
  statusTimestampField,
  isClosedStatus,
  type RequestStatus,
} from "./requests.workflow.js";
import type {
  CreateRequestInput,
  ListQuery,
  UpdateRequestInput,
} from "./requests.schema.js";

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
    include: {
      medications: true,
      timeline: { orderBy: { timestamp: "asc" } },
      attachments: true,
      referral: true,
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
  const { id, ...rest } = input;

  const status: RequestStatus =
    rest.serviceType === "monthly_treatment"
      ? "pending_monthly_doctor"
      : rest.requestType === "emergency"
      ? "approved"
      : "pending";

  const created = await prisma.medicalRequest.create({
    data: {
      ...(id ? { id } : {}),
      ...rest,
      status,
      ...(status === "approved" ? { approvedAt: new Date() } : {}),
      createdBy: actor.id,
      timeline: {
        create: [
          {
            status,
            userId: actor.id,
            userName: actor.name,
            userRole: actor.role,
            notes: rest.notes ?? null,
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

function mapReferral(r: NonNullable<UpdateRequestInput["referralData"]>) {
  return {
    specialty: r.specialty,
    priority: r.priority,
    facility: r.facility,
    externalDoctor: r.externalDoctor ?? null,
    reason: r.reason,
    adminNotes: r.adminNotes ?? null,
    status: r.status,
    submittedAt: new Date(r.submittedAt),
    reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : null,
    reviewedBy: r.reviewedBy ?? null,
  };
}

export async function updateRequest(
  id: string,
  input: UpdateRequestInput,
  actor: Actor,
) {
  const existing = await prisma.medicalRequest.findUnique({ where: { id } });
  if (!existing) throw notFound("الطلب غير موجود");
  if (isClosedStatus(existing.status as RequestStatus)) {
    throw badRequest("لا يمكن تعديل طلب مغلق");
  }

  const { medications, referralData, ...scalars } = input;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.medicalRequest.update({
      where: { id },
      data: scalars,
    });

    // استبدال قائمة الأدوية بالكامل لو مبعوتة
    if (medications) {
      await tx.requestMedication.deleteMany({ where: { requestId: id } });
      if (medications.length > 0) {
        await tx.requestMedication.createMany({
          data: medications.map((m) => ({ ...m, requestId: id })),
        });
      }
    }

    // إنشاء/تحديث الإحالة لو مبعوتة
    if (referralData) {
      const data = mapReferral(referralData);
      await tx.referral.upsert({
        where: { requestId: id },
        create: { requestId: id, ...data },
        update: data,
      });
    }

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        userName: actor.name,
        action: "UPDATE_REQUEST",
        entityType: "MedicalRequest",
        entityId: id,
      },
    });

    return updated;
  });
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
