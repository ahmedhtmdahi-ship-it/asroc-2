export interface SecurityLogEntry {
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  action: "CHECK_IN" | "CHECK_OUT";
  doneBy: string;
  createdAt: string;
}

export const mockSecurityLogs: SecurityLogEntry[] = [];
