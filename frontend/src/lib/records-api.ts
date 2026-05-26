import type { RecordRequest, RecordResponse } from "@/types/record";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_CERTIFY_API_URL) || "/api/certify";

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, init);
    const text = await res.text();
    let data: T | undefined;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = text as T;
      }
    }
    if (!res.ok) {
      const message = parseErrorMessage(data, text, res.statusText);
      return { error: message, status: res.status, data };
    }
    return { data, status: res.status };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Network error",
      status: 0,
    };
  }
}

function parseErrorMessage(data: unknown, text: string, statusText: string): string {
  if (typeof data === "object" && data) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0] as { message?: string; errorMessage?: string };
      return first.message || first.errorMessage || text || statusText;
    }
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
  }
  return text || statusText;
}

/** GET /records — list all person records. */
export async function listRecords() {
  return apiFetch<RecordResponse[]>("/records", { method: "GET" });
}

/** GET /records/{id} */
export async function getRecordById(id: string) {
  return apiFetch<RecordResponse>(`/records/${encodeURIComponent(id)}`, { method: "GET" });
}

/** POST /records — create person record (server-generated id). */
export async function createRecord(body: RecordRequest) {
  return apiFetch<RecordResponse>("/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** PUT /records/{id} */
export async function updateRecord(id: string, body: RecordRequest) {
  return apiFetch<RecordResponse>(`/records/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** DELETE /records/{id} */
export async function deleteRecord(id: string) {
  return apiFetch<string>(`/records/${encodeURIComponent(id)}`, { method: "DELETE" });
}
