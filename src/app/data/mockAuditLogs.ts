import type { RequestStatus } from "@/app/types/workflow";

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  requestId: string;
  serviceType: string;
  statusBefore: RequestStatus;
  statusAfter: RequestStatus;
  note?: string;
  createdAt: string;
}

export const mockAuditLogs: AuditLogEntry[] = [];
