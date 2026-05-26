import { DEFAULT_CONFIG_KEYS, FARMER_CREDENTIAL_CONFIG } from "@/lib/credential-config-defaults";
import type { CredentialConfigResponse, CredentialConfiguration } from "@/types/credential-config";

const REGISTRY_KEY = "inji:credential-config-keys";
const cacheKey = (id: string) => `inji:credential-config:${id}`;

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_CERTIFY_API_URL) || "/api/certify";

/** GET path (relative to API_BASE) — matches Certify `CredentialConfigController`. */
export const CREDENTIAL_CONFIG_BY_ID_PATH = (id: string) =>
  `/credential-configurations/${encodeURIComponent(id)}`;

/**
 * Config IDs we always try to load from Certify on the credentials list (GET by id),
 * merged with the local registry. Override or extend with
 * `VITE_CERTIFY_CREDENTIAL_CONFIG_IDS` (comma-separated).
 */
const DEFAULT_REMOTE_CONFIG_IDS = ["HealthID"];

function parseEnvConfigIds(): string[] {
  const raw =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_CERTIFY_CREDENTIAL_CONFIG_IDS;
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function getRegistry(): string[] {
  if (!isBrowser()) return [...DEFAULT_CONFIG_KEYS];
  const raw = localStorage.getItem(REGISTRY_KEY);
  if (!raw) {
    seedLocalRegistry();
    return [...DEFAULT_CONFIG_KEYS];
  }
  try {
    const keys = JSON.parse(raw) as string[];
    return keys.length ? keys : [...DEFAULT_CONFIG_KEYS];
  } catch {
    return [...DEFAULT_CONFIG_KEYS];
  }
}

/** All credential_config_key_id values to show on /credentials (union: registry + defaults + env). */
export function getCredentialConfigIdsToList(): string[] {
  const merged = new Set<string>([
    ...getRegistry(),
    ...DEFAULT_CONFIG_KEYS,
    ...DEFAULT_REMOTE_CONFIG_IDS,
    ...parseEnvConfigIds(),
  ]);
  return [...merged];
}

function seedLocalRegistry() {
  if (!isBrowser()) return;
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(DEFAULT_CONFIG_KEYS));
  if (DEFAULT_CONFIG_KEYS.includes(FARMER_CREDENTIAL_CONFIG.credentialConfigKeyId!)) {
    localStorage.setItem(
      cacheKey(FARMER_CREDENTIAL_CONFIG.credentialConfigKeyId!),
      JSON.stringify(FARMER_CREDENTIAL_CONFIG),
    );
  }
}

export function cacheConfig(config: CredentialConfiguration) {
  if (!isBrowser() || !config.credentialConfigKeyId) return;
  const id = config.credentialConfigKeyId;
  const keys = new Set(getRegistry());
  keys.add(id);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify([...keys]));
  localStorage.setItem(cacheKey(id), JSON.stringify(config));
}

export function removeCachedConfig(id: string) {
  if (!isBrowser()) return;
  const keys = getRegistry().filter((k) => k !== id);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(keys));
  localStorage.removeItem(cacheKey(id));
}

export function getCachedConfig(id: string): CredentialConfiguration | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(cacheKey(id));
  if (!raw)
    return id === FARMER_CREDENTIAL_CONFIG.credentialConfigKeyId ? FARMER_CREDENTIAL_CONFIG : null;
  try {
    return JSON.parse(raw) as CredentialConfiguration;
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
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
      const message =
        typeof data === "object" && data && "message" in data
          ? String((data as { message: string }).message)
          : text || res.statusText;
      return { error: message, status: res.status };
    }
    return { data, status: res.status };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Network error",
      status: 0,
    };
  }
}

/**
 * GET {{certifyurl}}/credential-configurations/{{credential_config_id}}
 * Caches successful responses in localStorage for offline edit.
 */
export async function getCredentialConfigurationById(
  id: string,
): Promise<{ config: CredentialConfiguration; fromApi: boolean; error?: string }> {
  return fetchCredentialConfig(id);
}

export async function fetchCredentialConfig(
  id: string,
): Promise<{ config: CredentialConfiguration; fromApi: boolean; error?: string }> {
  const { data, error } = await apiFetch<CredentialConfiguration>(CREDENTIAL_CONFIG_BY_ID_PATH(id));
  if (data) {
    cacheConfig(data);
    return { config: data, fromApi: true };
  }
  const cached = getCachedConfig(id);
  if (cached) return { config: cached, fromApi: false, error };
  return {
    config: { credentialConfigKeyId: id },
    fromApi: false,
    error: error ?? "Configuration not found",
  };
}

export async function listCredentialConfigs(): Promise<
  Array<{ id: string; config: CredentialConfiguration; fromApi: boolean }>
> {
  const keys = getCredentialConfigIdsToList();
  const results = await Promise.all(
    keys.map(async (id) => {
      const { config, fromApi } = await fetchCredentialConfig(id);
      return { id, config, fromApi };
    }),
  );
  return results;
}

export async function createCredentialConfig(
  body: CredentialConfiguration,
): Promise<{ ok: boolean; id?: string; error?: string; offline?: boolean }> {
  cacheConfig(body);
  const { data, error, status } = await apiFetch<CredentialConfigResponse>(
    "/credential-configurations",
    { method: "POST", body: JSON.stringify(body) },
  );
  if (status === 201 && data?.id) {
    cacheConfig({ ...body, credentialConfigKeyId: data.id });
    return { ok: true, id: data.id };
  }
  if (body.credentialConfigKeyId) {
    return { ok: true, id: body.credentialConfigKeyId, offline: true, error };
  }
  return { ok: false, error: error ?? "Create failed" };
}

export async function updateCredentialConfig(
  id: string,
  body: CredentialConfiguration,
): Promise<{ ok: boolean; error?: string; offline?: boolean }> {
  cacheConfig({ ...body, credentialConfigKeyId: id });
  const { error, status } = await apiFetch<CredentialConfigResponse>(
    CREDENTIAL_CONFIG_BY_ID_PATH(id),
    { method: "PUT", body: JSON.stringify(body) },
  );
  if (status === 200) return { ok: true };
  return { ok: true, offline: true, error };
}

export async function deleteCredentialConfig(
  id: string,
): Promise<{ ok: boolean; error?: string; offline?: boolean }> {
  const { error, status } = await apiFetch<string>(CREDENTIAL_CONFIG_BY_ID_PATH(id), {
    method: "DELETE",
  });
  removeCachedConfig(id);
  if (status === 200) return { ok: true };
  return { ok: true, offline: true, error };
}

export function decodeVcTemplate(base64?: string): string {
  if (!base64) return "";
  try {
    return atob(base64);
  } catch {
    return "";
  }
}

export function encodeVcTemplate(json: string): string {
  return btoa(json);
}
