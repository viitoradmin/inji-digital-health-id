import type {
  CredentialOfferResponse,
  OAuthTokenResponse,
  PreAuthorizedRequest,
  PreAuthorizedResponse,
} from "@/types/issuance";

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
      const message =
        typeof data === "object" && data && "message" in data
          ? String((data as { message: string }).message)
          : typeof data === "object" && data && "error" in data
            ? String((data as { error: string }).error)
            : text || res.statusText;
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

/** POST /pre-authorized-data */
export async function generatePreAuthorizedCode(body: PreAuthorizedRequest) {
  return apiFetch<PreAuthorizedResponse>("/pre-authorized-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** GET /credential-offer-data/{offer_id} */
export async function getCredentialOffer(offerId: string) {
  return apiFetch<CredentialOfferResponse>(`/credential-offer-data/${encodeURIComponent(offerId)}`);
}

/** POST /oauth/token (pre-authorized_code grant) */
export async function exchangePreAuthorizedCode(params: {
  pre_authorized_code: string;
  tx_code?: string;
}) {
  const body = new URLSearchParams();
  body.set("grant_type", "urn:ietf:params:oauth:grant-type:pre-authorized_code");
  body.set("pre-authorized_code", params.pre_authorized_code);
  if (params.tx_code) body.set("tx_code", params.tx_code);

  return apiFetch<OAuthTokenResponse>("/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

interface IssuedCredentialResponse {
  credential?: unknown;
  format?: string;
}

let _issuerCache: string | null = null;

/** Fetch the OAuth Authorization Server issuer URL (used as JWT aud). Cached. */
export async function getCertifyIssuerUrl(): Promise<string> {
  if (_issuerCache) return _issuerCache;
  const { data } = await apiFetch<{ issuer?: string }>("/.well-known/oauth-authorization-server");
  if (data?.issuer) {
    _issuerCache = data.issuer;
    return data.issuer;
  }
  const envUrl =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.VITE_CERTIFY_API_URL as string | undefined)
      : undefined;
  return envUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
}

/** POST /issuance/credential — requires bearer access_token and proof JWT. */
export async function issueCredential(params: {
  accessToken: string;
  format: string;
  contextURLs: string[];
  credentialTypes: string[];
  proofJwt: string;
}) {
  return apiFetch<IssuedCredentialResponse>("/issuance/credential", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      format: params.format,
      credential_definition: {
        "@context": params.contextURLs,
        type: params.credentialTypes,
      },
      proof: { proof_type: "jwt", jwt: params.proofJwt },
    }),
  });
}

const GRANT_KEY = "urn:ietf:params:oauth:grant-type:pre-authorized_code";

export function getPreAuthorizedCodeFromOffer(offer: CredentialOfferResponse): string | undefined {
  return offer.grants?.[GRANT_KEY]?.["pre-authorized_code"];
}

/** Extract offer UUID from openid-credential-offer URI (matches Postman collection script). */
export function extractOfferId(credentialOfferUri: string): string | null {
  try {
    const query = credentialOfferUri.includes("?")
      ? credentialOfferUri.split("?")[1]
      : credentialOfferUri;
    const params = new URLSearchParams(query);
    const offerFetchUrl = params.get("credential_offer_uri");
    if (!offerFetchUrl) return null;
    const decoded = decodeURIComponent(offerFetchUrl);
    const segment = decoded.replace(/\/$/, "").split("/").pop();
    return segment && /^[0-9a-f-]{36}$/i.test(segment) ? segment : (segment ?? null);
  } catch {
    return null;
  }
}
