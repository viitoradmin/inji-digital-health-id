import type { ParsedCredentialMeta } from "@/types/verification";

/** Normalize user input into a VC object for inji-verify (stringified in API body). */
export function parseCredentialInput(raw: string): {
  vc: Record<string, unknown>;
  meta: ParsedCredentialMeta;
} {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Credential input is empty");

  // JWT (compact JWS): payload may contain `vc` or be the credential itself
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
    const payload = decodeJwtPayload(trimmed);
    const vc =
      (payload.vc as Record<string, unknown>) ??
      (payload.verifiableCredential as Record<string, unknown>) ??
      payload;
    return { vc, meta: extractMeta(vc) };
  }

  // JSON-LD VC or issuance response { credential: ... }
  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  const vc =
    (parsed.credential as Record<string, unknown>) ??
    (parsed.verifiableCredential as Record<string, unknown>) ??
    parsed;

  if (!vc || typeof vc !== "object") {
    throw new Error("Could not find a credential object in JSON");
  }

  return { vc, meta: extractMeta(vc) };
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length < 2) throw new Error("Invalid JWT format");
  const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const json = atob(padded);
  return JSON.parse(json) as Record<string, unknown>;
}

function extractMeta(vc: Record<string, unknown>): ParsedCredentialMeta {
  const issuer = vc.issuer;
  const types = Array.isArray(vc.type) ? (vc.type as string[]) : undefined;
  const subject =
    vc.credentialSubject && typeof vc.credentialSubject === "object"
      ? (vc.credentialSubject as Record<string, unknown>)
      : undefined;

  return {
    issuer: typeof issuer === "string" ? issuer : JSON.stringify(issuer ?? ""),
    types,
    subject,
    expirationDate: typeof vc.expirationDate === "string" ? vc.expirationDate : undefined,
    issuanceDate:
      typeof vc.validFrom === "string"
        ? vc.validFrom
        : typeof vc.issuanceDate === "string"
          ? vc.issuanceDate
          : undefined,
  };
}

export async function readCredentialFile(file: File): Promise<string> {
  const text = await file.text();
  return text.trim();
}

export async function fetchCredentialFromUri(uri: string): Promise<string> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Failed to fetch URI (${res.status})`);
  return res.text();
}
