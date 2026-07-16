import { prisma } from "../../db/prisma.js";
import { badRequest, conflict, notFound } from "../../lib/httpError.js";
import { MONTHLY_CHECKUP_LIMIT } from "@asroc/shared/policy.js";
import {
  canMove,
  statusLabels,
  statusTimestampField,
  closedRequestStatuses,
  isClosedStatus,
  type RequestStatus,
} from "./requests.workflow.js";
import type {
  CreateRequestInput,
  UpdateRequestInput,
} from "./requests.schema.js";

interface Actor {
  id: string;
  name: string;
  role: string;
}

/**
 * فلتر عرض الطلبات — بيتبني في الـ route من هوية المستخدم (مش من العميل مباشرة).
 * حقل department بيحدّده السيرفر لتقييد المدير على إدارته فقط (فصل الإدارات).
 */
export interface ListFilter {
  employeeId?: string;
  status?: RequestStatus;
  department?: string;
}

export async function listRequests(filter: ListFilter) {
  return prisma.medicalRequest.findMany({
    where: {
      ...(filter.employeeId ? { employeeId: filter.employeeId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.department ? { department: filter.department } : {}),
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
  const rest = input;

  const status: RequestStatus =
    rest.serviceType === "monthly_treatment"
      ? "pending_monthly_doctor"
      : rest.requestType === "emergency"
      ? "approved"
      : "pending";

  // قواعد العمل بتتطبق هنا (مش في الواجهة بس) — الواجهة بتفحصها لتحسين التجربة،
  // لكن السيرفر هو الحكم: أي نداء مباشر للـ API بيتحاسب بنفس القواعد.
  const created = await prisma.$transaction(async (tx) => {
    // 1) طلب مفتوح واحد فقط لكل موظف — أي نوع طلب بيتحجب لو فيه طلب لسه شغال.
    const openCount = await tx.medicalRequest.count({
      where: {
        employeeId: rest.employeeId,
        status: { notIn: closedRequestStatuses },
      },
    });
    if (openCount > 0) {
      throw conflict("يوجد طلب مفتوح بالفعل لهذا الموظف — يجب إغلاقه أولًا");
    }

    // 2) حد الكشوفات العادية المكتملة في الشهر الميلادي الحالي.
    if (rest.serviceType !== "monthly_treatment" && rest.requestType !== "emergency") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const used = await tx.medicalRequest.count({
        where: {
          employeeId: rest.employeeId,
          serviceType: "checkup",
          requestType: "normal",
          status: "completed",
          createdAt: { gte: monthStart },
        },
      });
      if (used >= MONTHLY_CHECKUP_LIMIT) {
        throw badRequest(
          `تم استهلاك الحد الشهري للكشوفات العادية (${MONTHLY_CHECKUP_LIMIT})`,
        );
      }
    }

    // الـ id بيتولّد على السيرفر (uuid) — العميل لا يرسل معرّفات.
    return tx.medicalRequest.create({
      data: {
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
      include: {
        medications: true,
        timeline: { orderBy: { timestamp: "asc" } },
        attachments: true,
        referral: true,
      },
    });
  });

  // Best-effort audit (لا نُفشل العملية الأساسية بسبب drift في AuditLog schema/DB).
  // طلب الطوارئ بيتعمل approve تلقائي (بيتخطّى المدير) — بنسجّله صراحةً بتفاصيل
  // عشان يكون فيه أثر واضح لأي تخطّي لموافقة المدير.
  const isEmergency = input.requestType === "emergency";
  try {
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        userName: actor.name,
        action: isEmergency ? "CREATE_REQUEST_EMERGENCY" : "CREATE_REQUEST",
        entityType: "MedicalRequest",
        entityId: created.id,
        details: isEmergency
          ? { emergency: true, autoApproved: true, bypassedManagerApproval: true }
          : undefined,
      },
    });
  } catch {
    // ignore
  }

  // سياسة الطوارئ: مفتوحة لأي موظف (للحالات الحقيقية) لكن مدير الإدارة بياخد علم
  // فورًا بأي طلب طوارئ اتخطّى موافقته — إشعار + الـ audit فوق. best-effort:
  // ما بنفشلش إنشاء الطلب لو الإشعار فشل، وبنتأكد إن المدير مستخدم فعلي (قيد الـ FK).
  if (isEmergency) {
    try {
      const dept = await prisma.department.findFirst({
        where: { name: created.department },
        select: { managerId: true, managerFinancialNumber: true },
      });
      const managerOr = [
        ...(dept?.managerId ? [{ id: dept.managerId }] : []),
        ...(dept?.managerFinancialNumber
          ? [{ financialNumber: dept.managerFinancialNumber }]
          : []),
      ];
      const manager = managerOr.length
        ? await prisma.user.findFirst({
            where: { OR: managerOr, isActive: true },
            select: { id: true },
          })
        : null;
      if (manager) {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            title: "طلب طوارئ في إدارتك",
            message: `${created.employeeName} أنشأ طلب كشف طوارئ (${created.id}) واعتُمد تلقائيًا وأُرسل للأمن. السبب: ${created.reason}`,
            requestId: created.id,
            icon: "AlertTriangle",
            color: "text-red-700",
            bg: "bg-red-50",
          },
        });
      }
    } catch {
      // best-effort — الإشعار ما بيوقفش إنشاء الطلب
    }
  }

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
    await tx.medicalRequest.update({
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

    try {
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          userName: actor.name,
          action: "UPDATE_REQUEST",
          entityType: "MedicalRequest",
          entityId: id,
        },
      });
    } catch {
      // ignore audit write failures
    }

    return tx.medicalRequest.findUnique({
      where: { id },
      include: {
        medications: true,
        timeline: { orderBy: { timestamp: "asc" } },
        attachments: true,
        referral: true,
      },
    });
  });
}

export async function transitionRequest(
  requestId: string,
  nextStatus: RequestStatus,
  note: string | undefined,
  actor: Actor,
) {
  // كل التغييرات في معاملة واحدة — يا كلها تنجح يا تترجع.
  // القراءة + التعديل جوه نفس المعاملة، والتعديل مشروط بالحالة الحالية (compare-and-set)
  // عشان النداءات المتتالية/المتزامنة ما تتسابقش وتسيب الطلب في حالة غلط.
  return prisma.$transaction(async (tx) => {
    const current = await tx.medicalRequest.findUnique({ where: { id: requestId } });
    if (!current) throw notFound("الطلب غير موجود");

    if (!canMove(current.status as RequestStatus, nextStatus)) {
      throw badRequest(`تحويل غير صالح: ${current.status} → ${nextStatus}`);
    }

    const updateData: Record<string, unknown> = { status: nextStatus };
    const tsField = statusTimestampField[nextStatus];
    if (tsField) updateData[tsField] = new Date();

    // تعديل مشروط: يتنفّذ بس لو الحالة لسه زي ما قرأناها.
    const res = await tx.medicalRequest.updateMany({
      where: { id: requestId, status: current.status },
      data: updateData,
    });
    if (res.count === 0) {
      throw conflict("تغيّرت حالة الطلب أثناء المعالجة — حدّث الصفحة وحاول تاني");
    }

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

    try {
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
    } catch {
      // ignore audit write failures (DB might be missing some audit columns)
    }

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

    // نرجّع الطلب كامل بعلاقاته عشان الواجهة تحدّث الـ timeline/الأدوية بعد التحويل.
    return tx.medicalRequest.findUnique({
      where: { id: requestId },
      include: {
        medications: true,
        timeline: { orderBy: { timestamp: "asc" } },
        attachments: true,
        referral: true,
      },
    });
  });
}
