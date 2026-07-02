import { listSecurityLogsApi } from "@/app/lib/dataApi";

class SecurityStore {
  private records: any[] = [];

  private setRecords(records: any[]) {
    this.records = records;
  }

  getAll() {
    return this.records;
  }

  add(record: any) {
    this.records.push(record);
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
  }
}

export const securityStore = new SecurityStore();
