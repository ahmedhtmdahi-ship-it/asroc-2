import { listAuditLogsApi } from "@/app/lib/dataApi";

class AuditStore {
  private logs: any[] = [];

  private setLogs(logs: any[]) {
    this.logs = logs;
  }

  getAll() {
    return this.logs;
  }

  add(log: any) {
    this.logs.push(log);
    return log;
  }

  async syncFromApi(): Promise<void> {
    try {
      const data = await listAuditLogsApi(500);
      this.setLogs(data);
    } catch {
      // keep in-memory logs if sync fails
    }
  }

  clear() {
    this.logs = [];
  }
}

export const auditStore = new AuditStore();
