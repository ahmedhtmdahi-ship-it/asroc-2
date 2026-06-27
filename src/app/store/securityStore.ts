import { mockSecurityLogs, type SecurityLogEntry } from "@/app/data/mockSecurityLogs";

const STORAGE_KEY = "asorc_security_logs";

function loadSecurityLogs(): SecurityLogEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as SecurityLogEntry[]) : [...mockSecurityLogs];
  } catch {
    return [...mockSecurityLogs];
  }
}

class SecurityStore {
  private records: SecurityLogEntry[] = loadSecurityLogs();

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
  }

  getAll(): SecurityLogEntry[] {
    return this.records;
  }

  add(record: SecurityLogEntry) {
    this.records.push(record);
    this.persist();
    return record;
  }

  clear() {
    this.records = [...mockSecurityLogs];
    this.persist();
  }
}

export const securityStore = new SecurityStore();
