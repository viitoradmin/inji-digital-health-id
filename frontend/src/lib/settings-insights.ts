import { getRegistry, listCredentialConfigs } from "@/lib/credential-config-api";
import { loadIssuanceHistory } from "@/lib/issuance-history";
import type { CredentialConfiguration } from "@/types/credential-config";
import type { IssuanceRecord } from "@/types/issuance";

const CERTIFY_API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_CERTIFY_API_URL) || "/api/certify";

const VERIFY_API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_VERIFY_API_URL) || "/api/verify";

export type ServiceHealth = {
  id: "certify" | "verify";
  label: string;
  url: string;
  status: "online" | "offline" | "checking";
  detail?: string;
  latencyMs?: number;
};

export type WorkspaceStats = {
  configCount: number;
  syncedWithApi: number;
  cachedOnly: number;
  formats: Record<string, number>;
  issuanceTotal: number;
  issuanceLast7Days: number;
  lastIssuance?: IssuanceRecord;
  lastIssuanceAt?: string;
};

export type ConfigSummary = {
  id: string;
  name: string;
  format: string;
  didUrl?: string;
  fromApi: boolean;
};

export async function checkCertifyHealth(): Promise<ServiceHealth> {
  const url = `${CERTIFY_API}/actuator/health`;
  return probe("certify", "Inji Certify", url);
}

export async function checkVerifyHealth(): Promise<ServiceHealth> {
  const url = `${VERIFY_API}/actuator/health`;
  const result = await probe("verify", "Inji Verify", url);
  if (result.status === "online") return result;

  const started = performance.now();
  try {
    const res = await fetch(`${VERIFY_API}/v2/vc-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verifiableCredential: "" }),
    });
    const latencyMs = Math.round(performance.now() - started);
    if (res.status === 0) {
      return { ...result, status: "offline", detail: "Unreachable on port 8095" };
    }
    return {
      id: "verify",
      label: "Inji Verify",
      url: `${VERIFY_API}/v2/vc-verification`,
      status: "online",
      detail: res.ok ? "API responding" : `API reachable (HTTP ${res.status})`,
      latencyMs,
    };
  } catch {
    return {
      id: "verify",
      label: "Inji Verify",
      url: VERIFY_API,
      status: "offline",
      detail: "Unreachable — start verify-service (port 8095)",
    };
  }
}

async function probe(id: "certify" | "verify", label: string, url: string): Promise<ServiceHealth> {
  const started = performance.now();
  try {
    const res = await fetch(url, { method: "GET" });
    const latencyMs = Math.round(performance.now() - started);
    if (!res.ok) {
      return {
        id,
        label,
        url,
        status: "offline",
        detail: `HTTP ${res.status}`,
        latencyMs,
      };
    }
    let detail = "Healthy";
    try {
      const body = (await res.json()) as { status?: string };
      if (body.status) detail = `Status: ${body.status}`;
    } catch {
      /* non-json health is fine */
    }
    return { id, label, url, status: "online", detail, latencyMs };
  } catch (e) {
    return {
      id,
      label,
      url,
      status: "offline",
      detail: e instanceof Error ? e.message : "Network error",
    };
  }
}

export async function loadWorkspaceStats(): Promise<WorkspaceStats> {
  const configs = await listCredentialConfigs();
  const history = loadIssuanceHistory();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const formats: Record<string, number> = {};
  for (const { config } of configs) {
    const fmt = config.credentialFormat ?? "unknown";
    formats[fmt] = (formats[fmt] ?? 0) + 1;
  }

  const recent = history.filter((r) => new Date(r.createdAt).getTime() >= weekAgo);

  return {
    configCount: configs.length,
    syncedWithApi: configs.filter((c) => c.fromApi).length,
    cachedOnly: configs.filter((c) => !c.fromApi).length,
    formats,
    issuanceTotal: history.length,
    issuanceLast7Days: recent.length,
    lastIssuance: history[0],
    lastIssuanceAt: history[0]?.createdAt,
  };
}

export async function loadConfigSummaries(): Promise<ConfigSummary[]> {
  const configs = await listCredentialConfigs();
  return configs.map(({ id, config, fromApi }) => ({
    id,
    name: config.metaDataDisplay?.[0]?.name ?? id,
    format: config.credentialFormat ?? "—",
    didUrl: config.didUrl,
    fromApi,
  }));
}

export function getPrimaryIssuerDid(
  configs: Array<{ config: CredentialConfiguration }>,
): string | undefined {
  const withDid = configs.find((c) => c.config.didUrl);
  return withDid?.config.didUrl;
}

export function getApiEndpoints() {
  return [
    {
      service: "Certify",
      proxy: CERTIFY_API,
      upstream: "http://localhost:8090/v1/certify",
      paths: [
        "POST /credential-configurations",
        "POST /pre-authorized-data",
        "POST /oauth/token",
        "POST /issuance/credential",
      ],
    },
    {
      service: "Verify",
      proxy: VERIFY_API,
      upstream: "http://localhost:8095/v1/verify",
      paths: ["POST /v2/vc-verification"],
    },
  ];
}

export function clearIssuanceHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("inji:issuance-history");
}

export function clearLocalConfigCache() {
  if (typeof window === "undefined") return;
  const keys = getRegistry();
  for (const id of keys) {
    localStorage.removeItem(`inji:credential-config:${id}`);
  }
  localStorage.removeItem("inji:credential-config-keys");
}
