import type { VCVerificationRequest, VCVerificationResult } from "@/types/verification";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_VERIFY_API_URL) || "/api/verify";

export async function verifyCredential(
  body: VCVerificationRequest,
): Promise<{ data?: VCVerificationResult; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/v2/vc-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: VCVerificationResult | undefined;
    let errorBody: Record<string, unknown> | undefined;

    if (text) {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        if (res.ok) {
          data = parsed as VCVerificationResult;
        } else {
          errorBody = parsed;
        }
      } catch {
        if (!res.ok) return { error: text || res.statusText, status: res.status };
      }
    }

    if (!res.ok) {
      const message =
        (errorBody?.message as string) ??
        (errorBody?.error as string) ??
        (errorBody?.errorMessage as string) ??
        text ??
        res.statusText;
      return { error: message, status: res.status, data: data as VCVerificationResult };
    }

    return { data, status: res.status };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Network error",
      status: 0,
    };
  }
}
