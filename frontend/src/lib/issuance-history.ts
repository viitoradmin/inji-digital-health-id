import type { IssuanceRecord } from "@/types/issuance";

const HISTORY_KEY = "inji:issuance-history";

export function loadIssuanceHistory(): IssuanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as IssuanceRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveIssuanceRecord(record: IssuanceRecord) {
  if (typeof window === "undefined") return;
  const list = loadIssuanceHistory();
  list.unshift(record);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
}
