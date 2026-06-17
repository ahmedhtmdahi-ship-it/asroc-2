import { mockRequests } from "@/app/data/mockRequests";
import type { MedicalRequest } from "@/app/types/request";
import type { RequestStatus } from "@/app/types/workflow";

const STORAGE_KEY = "asorc_requests";

function loadRequests(): MedicalRequest[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [...mockRequests];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [...mockRequests];
  } catch {
    return [...mockRequests];
  }
}

class RequestStore {
  private requests: MedicalRequest[] = loadRequests();

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.requests));
  }

  getAll() {
    return this.requests;
  }

  getById(id: string) {
    return this.requests.find((request) => request.id === id);
  }

  create(request: MedicalRequest) {
    this.requests.push(request);
    this.persist();
    return request;
  }

  updateStatus(id: string, status: RequestStatus) {
    const request = this.getById(id);

    if (!request) {
      return null;
    }

    request.status = status;
    this.persist();
    return request;
  }

  clear() {
    this.requests = [...mockRequests];
    this.persist();
  }
}

export const requestStore = new RequestStore();
