import type { RequestStatus } from "@/app/types/workflow";
import { canMove } from "@/app/types/workflow";
import { requestStore } from "./requestStore";

interface WorkflowActionPayload {
  requestId: string;
  userId: string;
  userName: string;
  role: string;
  note?: string;
}

class WorkflowStore {
  canMove(currentStatus: RequestStatus, nextStatus: RequestStatus) {
    return canMove(currentStatus, nextStatus);
  }

  moveStatus(payload: WorkflowActionPayload, nextStatus: RequestStatus) {
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

    // requestStore.updateStatus calls transitionRequestApi on the backend.
    // The backend creates the AuditLog, Notification, and SecurityLog records.
    // We do NOT write to local stores here to avoid double-writes.
    // بنمرّر الـ note عشان يتسجّل في timeline السيرفر (سبب قرار المدير/ملاحظة الطبيب).
    const updatedRequest = requestStore.updateStatus(
      payload.requestId,
      nextStatus,
      payload.note
    );

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
