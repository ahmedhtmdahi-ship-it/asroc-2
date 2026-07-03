import { apiFetch } from "./apiClient";

export interface Contract {
  id: string;
  name: string;
  specialty: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listContractsApi(params?: {
  specialty?: string;
  active?: string;
}): Promise<Contract[]> {
  const q = new URLSearchParams();
  if (params?.specialty) q.set("specialty", params.specialty);
  if (params?.active !== undefined) q.set("active", params.active);
  const qs = q.toString();
  return apiFetch<Contract[]>(`/contracts${qs ? `?${qs}` : ""}`);
}

export async function getContractApi(id: string): Promise<Contract> {
  return apiFetch<Contract>(`/contracts/${id}`);
}

export async function createContractApi(
  input: Omit<Contract, "id" | "createdAt" | "updatedAt">,
): Promise<Contract> {
  return apiFetch<Contract>("/contracts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateContractApi(
  id: string,
  fields: Partial<Omit<Contract, "id" | "createdAt" | "updatedAt">>,
): Promise<Contract> {
  return apiFetch<Contract>(`/contracts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export async function deleteContractApi(id: string): Promise<void> {
  await apiFetch(`/contracts/${id}`, { method: "DELETE" });
}
