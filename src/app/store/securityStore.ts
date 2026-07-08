import { listSecurityLogsApi, type ApiSecurityLog } from "@/app/lib/dataApi";
import { ReactiveStore } from "./reactiveStore";

class SecurityStore extends ReactiveStore {
  private records: ApiSecurityLog[] = [];

  private setRecords(records: ApiSecurityLog[]) {
    this.records = records;
    this.emit();
  }

  getAll(): ApiSecurityLog[] {
    return this.records;
  }

  add(record: ApiSecurityLog) {
    this.records = [...this.records, record];
    this.emit();
    return record;
  }

  async syncFromApi(): Promise<void> {
    try {
      const data = await listSecurityLogsApi(200);
      this.setRecords(data);
    } catch {
      // keep in-memory records if sync fails
    }
  }

  clear() {
    this.records = [];
    this.emit();
  }
}

export const securityStore = new SecurityStore();
