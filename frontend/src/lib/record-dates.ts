import { format, isValid, parseISO } from "date-fns";
import type { RecordDateField } from "@/types/record";

function parseDateTimeLoose(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const d = parseISO(value);
    return isValid(d) ? d : null;
  }
  if (Array.isArray(value)) {
    const [y, m, d, h = 0, min = 0, sec = 0, nano = 0] = value;
    if (typeof y !== "number" || typeof m !== "number" || typeof d !== "number") return null;
    const ms = typeof nano === "number" ? Math.floor(nano / 1_000_000) : 0;
    return new Date(y, m - 1, d, h, min, sec, ms);
  }
  return null;
}

/** Normalize date-of-birth from API to `yyyy-MM-dd` or empty string. */
export function normalizeRecordDateOfBirth(value: RecordDateField | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value;
    if (typeof y === "number" && typeof m === "number" && typeof d === "number") {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return "";
}

/** Display like `07 May, 2026 14:51` for table columns. */
export function formatRecordDateTime(value: unknown): string {
  const d = parseDateTimeLoose(value);
  if (!d) return "—";
  return format(d, "dd MMM, yyyy HH:mm");
}
