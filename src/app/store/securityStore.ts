import { mockSecurityLogs } from "@/app/data/mockSecurityLogs";

const STORAGE_KEY = "asorc_security_logs";

function loadSecurityLogs(): any[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [...mockSecurityLogs];
  } catch {
    return [...mockSecurityLogs];
  }
}

class SecurityStore {
  private records: any[] = loadSecurityLogs();

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
  }

  getAll() {
    return this.records;
  }

  add(record: any) {
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
