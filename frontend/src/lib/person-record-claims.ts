import { sampleClaimsForConfig } from "@/lib/issuance-claim-samples";
import type { RecordResponse } from "@/types/record";
import { normalizeRecordDateOfBirth } from "@/lib/record-dates";

/**
 * Merge person record fields into pre-authorized issuance claims for a credential configuration.
 */
export function buildIssuanceClaimsFromPersonRecord(
  record: RecordResponse,
  configId: string,
  displayOrder?: string[],
): Record<string, string> {
  // Use sample config only to get the correct set of KEYS — start with blank values
  // so no sample data (e.g. Shailesh Gojiya) leaks into the real credential.
  const template = sampleClaimsForConfig(configId, displayOrder);
  const base: Record<string, string> = Object.fromEntries(
    Object.keys(template).map((k) => [k, ""]),
  );

  const first = record.firstName?.trim() ?? "";
  const last = record.lastName?.trim() ?? "";
  const fullName = [first, last].filter(Boolean).join(" ").trim();
  const dob = normalizeRecordDateOfBirth(record.dateOfBirth);

  const overlay: Record<string, string> = {
    id: record.id,
    personId: record.id,
    firstName: first,
    lastName: last,
    fullName,
    email: record.email?.trim() ?? "",
    phoneNumber: record.phoneNumber?.trim() ?? "",
    mobileNumber: record.phoneNumber?.trim() ?? "",
    dateOfBirth: dob,
    gender: record.gender?.trim() ?? "",
  };

  const merged: Record<string, string> = { ...base };
  for (const key of Object.keys(merged)) {
    const v = overlay[key];
    if (v !== undefined) merged[key] = v; // "" is valid — clears any residual blank
  }
  return merged;
}
