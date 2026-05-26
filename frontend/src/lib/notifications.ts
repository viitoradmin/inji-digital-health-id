export type NotificationType = "issuance" | "verification" | "config" | "system";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  href?: string;
};

const READ_KEY = "inji:notifications-read";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
}

/** Demo notifications aligned with Inji Certify / Verify workflows. */
export const DUMMY_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    type: "issuance",
    title: "Pre-authorized offer created",
    message: "FarmerCredential offer generated with 600s expiry and tx_code enabled.",
    createdAt: hoursAgo(0.5),
    href: "/issuance",
  },
  {
    id: "n2",
    type: "verification",
    title: "Verification checks passed",
    message: "Schema, signature, expiry, and revocation checks succeeded for a sample VC.",
    createdAt: hoursAgo(2),
    href: "/verify",
  },
  {
    id: "n3",
    type: "config",
    title: "Credential configuration synced",
    message: "FarmerCredential is available on Certify at /credential-configurations.",
    createdAt: hoursAgo(5),
    href: "/credentials/FarmerCredential",
  },
  {
    id: "n4",
    type: "issuance",
    title: "OAuth token exchanged",
    message:
      "Wallet test flow completed step 3 — access_token issued for pre-authorized_code grant.",
    createdAt: hoursAgo(8),
    href: "/issuance",
  },
  {
    id: "n5",
    type: "verification",
    title: "DID resolution warning",
    message:
      "Verify service could not resolve did:web:localhost — use stack DID URLs in local dev.",
    createdAt: daysAgo(1),
    href: "/verify",
  },
  {
    id: "n6",
    type: "system",
    title: "Certify service healthy",
    message: "GET /actuator/health returned UP. Issuer endpoints ready on port 8090.",
    createdAt: daysAgo(1),
    href: "/settings",
  },
  {
    id: "n7",
    type: "config",
    title: "VC template updated",
    message: "Display order and metaDataDisplay saved for Farmer Verifiable Credential.",
    createdAt: daysAgo(2),
    href: "/credentials/FarmerCredential",
  },
];

export function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function saveReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export function markAllRead(ids: string[]) {
  saveReadIds(new Set(ids));
}

export function markRead(id: string, current: Set<string>) {
  const next = new Set(current);
  next.add(id);
  saveReadIds(next);
  return next;
}
