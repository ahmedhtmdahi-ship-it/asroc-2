import { mockAuditLogs } from "@/app/data/mockAuditLogs";

const STORAGE_KEY = "asorc_audit_logs";

function loadAuditLogs(): any[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [...mockAuditLogs];
  } catch {
    return [...mockAuditLogs];
  }
}

class AuditStore {
  private logs: any[] = loadAuditLogs();

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
  }

  getAll() {
    return this.logs;
  }

  add(log: any) {
    this.logs.push(log);
    this.persist();
    return log;
  }

  clear() {
    this.logs = [...mockAuditLogs];
    this.persist();
  }
}

export const auditStore = new AuditStore();
