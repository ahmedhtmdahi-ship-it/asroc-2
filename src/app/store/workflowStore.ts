import { requestStatusLabels, type RequestStatus } from "@/app/types/workflow";
import { requestStore } from "./requestStore";
import { notificationStore } from "./notificationStore";
import { auditStore } from "./auditStore";
import { securityStore } from "./securityStore";

interface WorkflowActionPayload {
  requestId: string;
  userId: string;
  userName: string;
  role: string;
  note?: string;
}

const statusFlow: Record<RequestStatus, RequestStatus[]> = {
  // Checkup flow
  pending: ["approved", "rejected", "postponed", "cancelled"],
  approved: ["checked_out"],
  checked_out: ["in_diagnosis"],
  in_diagnosis: ["prescribed"],
  prescribed: ["dispensed"],
  dispensed: ["returned"],
  returned: ["completed"],

  // Closed / alternative checkup states
  completed: [],
  rejected: [],
  postponed: ["pending", "cancelled"],
  cancelled: [],

  // Monthly treatment flow
  pending_monthly_doctor: [
    "monthly_approved",
    "monthly_rejected",
    "monthly_modified",
    "cancelled",
  ],
  monthly_approved: ["monthly_ready_pharmacy"],
  monthly_modified: ["monthly_ready_pharmacy", "monthly_rejected"],
  monthly_ready_pharmacy: ["monthly_dispensed"],
  monthly_dispensed: ["monthly_completed"],

  // Closed monthly treatment states
  monthly_rejected: [],
  monthly_completed: [],
};

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function getStatusLabel(status: RequestStatus) {
  return requestStatusLabels[status] || status;
}

class WorkflowStore {
  canMove(currentStatus: RequestStatus, nextStatus: RequestStatus) {
    return statusFlow[currentStatus]?.includes(nextStatus) ?? false;
  }

  async moveStatus(payload: WorkflowActionPayload, nextStatus: RequestStatus) {
    const request = requestStore.getById(payload.requestId);

    if (!request) {
      throw new Error("Request not found");
    }

    const previousStatus = request.status;

    if (!this.canMove(previousStatus, nextStatus)) {
      throw new Error(
        `Invalid workflow transition: ${previousStatus} → ${nextStatus}`
      );
    }

    const updatedRequest = await requestStore.updateStatus(
      payload.requestId,
      nextStatus
    );

    if (!updatedRequest) {
      throw new Error("Failed to persist request status");
    }

    auditStore.add({
      id: generateId("AUD"),
      userId: payload.userId,
      userName: payload.userName,
      role: payload.role,
      action: "MOVE_REQUEST_STATUS",
      requestId: payload.requestId,
      serviceType: request.serviceType ?? "",
      statusBefore: previousStatus,
      statusAfter: nextStatus,
      note: payload.note,
      createdAt: new Date().toISOString(),
    });

    notificationStore.add({
      id: generateId("NOT"),
      userId: request.employeeId,
      title: "تحديث حالة الطلب",
      message: `تم تحديث حالة الطلب من ${getStatusLabel(
        previousStatus
      )} إلى ${getStatusLabel(nextStatus)}`,
      requestId: payload.requestId,
      unread: true,
      createdAt: new Date().toISOString(),
    });

    if (nextStatus === "checked_out") {
      securityStore.add({
        id: generateId("SEC"),
        requestId: payload.requestId,
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        action: "CHECK_OUT",
        doneBy: payload.userName,
        createdAt: new Date().toISOString(),
      });
    }

    if (nextStatus === "returned") {
      securityStore.add({
        id: generateId("SEC"),
        requestId: payload.requestId,
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        action: "CHECK_IN",
        doneBy: payload.userName,
        createdAt: new Date().toISOString(),
      });
    }

    return updatedRequest;
  }

  // Checkup manager actions
  approve(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "approved");
  }

  reject(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "rejected");
  }

  postpone(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "postponed");
  }

  cancel(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "cancelled");
  }

  // Checkup security / doctor / pharmacy actions
  checkOut(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "checked_out");
  }

  startDiagnosis(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "in_diagnosis");
  }

  prescribe(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "prescribed");
  }

  dispense(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "dispensed");
  }

  checkIn(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "returned");
  }

  complete(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "completed");
  }

  // Monthly treatment doctor actions
  approveMonthlyTreatment(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "monthly_approved");
  }

  rejectMonthlyTreatment(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "monthly_rejected");
  }

  modifyMonthlyTreatment(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "monthly_modified");
  }

  sendMonthlyTreatmentToPharmacy(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "monthly_ready_pharmacy");
  }

  dispenseMonthlyTreatment(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "monthly_dispensed");
  }

  completeMonthlyTreatment(payload: WorkflowActionPayload) {
    return this.moveStatus(payload, "monthly_completed");
  }
}

export const workflowStore = new WorkflowStore();