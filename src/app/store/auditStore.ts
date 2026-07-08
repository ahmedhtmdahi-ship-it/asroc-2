import { listAuditLogsApi, type ApiAuditLog } from "@/app/lib/dataApi";
import { ReactiveStore } from "./reactiveStore";

class AuditStore extends ReactiveStore {
  private logs: ApiAuditLog[] = [];

  private setLogs(logs: ApiAuditLog[]) {
    this.logs = logs;
    this.emit();
  }

  getAll(): ApiAuditLog[] {
    return this.logs;
  }

  add(log: ApiAuditLog) {
    this.logs = [...this.logs, log];
    this.emit();
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
    this.emit();
  }
}

export const auditStore = new AuditStore();
