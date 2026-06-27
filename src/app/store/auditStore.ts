import { mockAuditLogs, type AuditLogEntry } from "@/app/data/mockAuditLogs";

const STORAGE_KEY = "asorc_audit_logs";

function loadAuditLogs(): AuditLogEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as AuditLogEntry[]) : [...mockAuditLogs];
  } catch {
    return [...mockAuditLogs];
  }
}

class AuditStore {
  private logs: AuditLogEntry[] = loadAuditLogs();

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
  }

  getAll(): AuditLogEntry[] {
    return this.logs;
  }

  add(log: AuditLogEntry) {
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
