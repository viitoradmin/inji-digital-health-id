import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { listCredentialConfigs } from "@/lib/credential-config-api";
import {
  exchangePreAuthorizedCode,
  extractOfferId,
  generatePreAuthorizedCode,
  getCertifyIssuerUrl,
  getCredentialOffer,
  getPreAuthorizedCodeFromOffer,
  issueCredential,
} from "@/lib/pre-authorized-api";
import { saveIssuanceRecord } from "@/lib/issuance-history";
import { verifyCredential } from "@/lib/verify-api";
import { sampleClaimsForConfig } from "@/lib/issuance-claim-samples";
import { getRecordById } from "@/lib/records-api";
import { buildIssuanceClaimsFromPersonRecord } from "@/lib/person-record-claims";
import { normalizeRecordDateOfBirth } from "@/lib/record-dates";
import { generateProofJwt } from "@/lib/proof-jwt";
import type { CredentialConfiguration } from "@/types/credential-config";
import type { RecordResponse } from "@/types/record";
import type {
  CredentialOfferResponse,
  IssuanceRecord,
  OAuthTokenResponse,
  PreAuthorizedResponse,
} from "@/types/issuance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Lock,
  QrCode,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/issuance")({
  head: () => ({ meta: [{ title: "Credential Issuance — Inji Certify" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    recordId: typeof search.recordId === "string" ? search.recordId : undefined,
    credentialConfigId:
      typeof search.credentialConfigId === "string" ? search.credentialConfigId : undefined,
  }),
  component: IssuancePage,
});

const FLOW_STEPS = [
  { n: 1, label: "Generate Offer", api: "POST /pre-authorized-data", icon: QrCode },
  { n: 2, label: "Fetch Offer", api: "GET /credential-offer-data/{id}", icon: Download },
  { n: 3, label: "Exchange Token", api: "POST /oauth/token", icon: KeyRound },
  { n: 4, label: "Issue Credential", api: "POST /issuance/credential", icon: ShieldCheck },
];

type StepLoading = "offer" | "token" | "credential" | null;
type ActivityEntry = {
  id: string;
  time: string;
  message: string;
  type: "success" | "error" | "info" | "pending";
};

/* ─────────────────────────────────────────────────────────────────────────── */

function IssuancePage() {
  /* existing state --------------------------------------------------------- */
  const [configs, setConfigs] = useState<Array<{ id: string; config: CredentialConfiguration }>>(
    [],
  );
  const [selectedId, setSelectedId] = useState("");
  const [claims, setClaims] = useState<Record<string, string>>({});
  const expiresIn = 600;
  const txCode = "12345";
  const useTxCode = true;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [offerResult, setOfferResult] = useState<PreAuthorizedResponse | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [fetchedOffer, setFetchedOffer] = useState<CredentialOfferResponse | null>(null);
  const [preAuthCode, setPreAuthCode] = useState<string | null>(null);
  const [tokenResult, setTokenResult] = useState<OAuthTokenResponse | null>(null);
  const [issuedCredential, setIssuedCredential] = useState<unknown>(null);
  const [stepLoading, setStepLoading] = useState<StepLoading>(null);
  const [fetchedRecord, setFetchedRecord] = useState<RecordResponse | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(
    null,
  );
  const [verifying, setVerifying] = useState(false);

  /* new state -------------------------------------------------------------- */
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handledRecordIdRef = useRef<string | undefined>(undefined);
  const { recordId, credentialConfigId } = Route.useSearch();
  const isConfigLocked = !!credentialConfigId;
  const selectedConfig = configs.find((c) => c.id === selectedId)?.config;

  /* derived values --------------------------------------------------------- */
  const completedSteps =
    issuedCredential !== null ? 4 : tokenResult ? 3 : fetchedOffer ? 2 : offerResult ? 1 : 0;

  const activeStepN: number | null = loading
    ? 1
    : stepLoading === "offer"
      ? 2
      : stepLoading === "token"
        ? 3
        : stepLoading === "credential"
          ? 4
          : null;

  const stepStatus = (n: number): "done" | "active" | "pending" | "idle" => {
    if (completedSteps >= n) return "done";
    if (activeStepN === n) return "active";
    if (offerResult !== null || loading) return "pending";
    return "idle";
  };

  /* helpers ---------------------------------------------------------------- */
  const logActivity = (message: string, type: ActivityEntry["type"] = "info") => {
    setActivityLog((prev) =>
      [
        {
          id: crypto.randomUUID(),
          time: new Date().toLocaleTimeString("en-US", { hour12: false }),
          message,
          type,
        },
        ...prev,
      ].slice(0, 16),
    );
  };

  const copyText = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  /* effects ---------------------------------------------------------------- */
  useEffect(() => {
    listCredentialConfigs().then((items) => {
      setConfigs(items.map(({ id, config }) => ({ id, config })));
      if (items.length && !selectedId) {
        // Prefer the credentialConfigId from URL, fall back to first config
        const preferred =
          credentialConfigId && items.some((c) => c.id === credentialConfigId)
            ? credentialConfigId
            : items[0].id;
        const cfg = items.find((c) => c.id === preferred)?.config;
        setSelectedId(preferred);
        setClaims(sampleClaimsForConfig(preferred, cfg?.displayOrder));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!offerResult?.credential_offer_uri) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(offerResult.credential_offer_uri, {
      width: 220,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [offerResult?.credential_offer_uri]);

  /* actions ---------------------------------------------------------------- */
  const onConfigChange = (id: string) => {
    setSelectedId(id);
    const cfg = configs.find((c) => c.id === id)?.config;
    setClaims(sampleClaimsForConfig(id, cfg?.displayOrder));
    setOfferResult(null);
    setFetchedOffer(null);
    setTokenResult(null);
    setIssuedCredential(null);
    setPreAuthCode(null);
    setOfferId(null);
    setError(null);
    setActivityLog([]);
    setVerifyResult(null);
  };

  const doFetchOffer = useCallback(async (id: string) => {
    setStepLoading("offer");
    setError(null);
    logActivity("Fetching credential offer…", "pending");
    const { data, error: apiError } = await getCredentialOffer(id);
    setStepLoading(null);
    if (!data) {
      setError(apiError ?? "Failed to fetch credential offer");
      logActivity(apiError ?? "Failed to fetch credential offer", "error");
      return;
    }
    setFetchedOffer(data);
    const code = getPreAuthorizedCodeFromOffer(data);
    setPreAuthCode(code ?? null);
    logActivity("Offer fetched · pre-authorized_code ready", "success");
  }, []);

  const handleGenerate = async (
    overrideConfigId?: string,
    overrideClaims?: Record<string, string>,
  ) => {
    const configId = overrideConfigId ?? selectedId;
    const claimsData = overrideClaims ?? claims;
    if (!configId) {
      setError("Select a credential configuration");
      return;
    }

    setLoading(true);
    setError(null);
    setOfferResult(null);
    setFetchedOffer(null);
    setTokenResult(null);
    setIssuedCredential(null);
    setActivityLog([]);
    setVerifyResult(null);
    logActivity("Generating credential offer…", "pending");

    const body = {
      credential_configuration_id: configId,
      claims: claimsData,
      expires_in: expiresIn,
      ...(useTxCode && txCode.trim() ? { tx_code: txCode.trim() } : {}),
    };
    const { data, error: apiError, status } = await generatePreAuthorizedCode(body);
    setLoading(false);

    if (!data?.credential_offer_uri) {
      // Backend may return HTTP 200 with an errors array (e.g. unknown_claims)
      const backendErrors =
        data &&
        typeof data === "object" &&
        "errors" in data &&
        Array.isArray((data as { errors: unknown[] }).errors) &&
        (data as { errors: Array<{ errorMessage?: string; errorCode?: string }> }).errors
          .map((e) => e.errorMessage ?? e.errorCode)
          .filter(Boolean)
          .join("; ");
      const msg = backendErrors || apiError || `Request failed (${status})`;
      setError(msg);
      logActivity(msg, "error");
      return;
    }

    const oid = extractOfferId(data.credential_offer_uri);
    setOfferResult(data);
    setOfferId(oid);
    setPreAuthCode(null);
    logActivity(
      `Offer created · ${oid ? `id: ${oid.slice(0, 8)}…` : "offer URI ready"}`,
      "success",
    );

    saveIssuanceRecord({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      credentialConfigurationId: configId,
      credentialOfferUri: data.credential_offer_uri,
      offerId: oid ?? undefined,
      claims: { ...claimsData },
      expiresIn,
      txCode: useTxCode ? txCode : undefined,
    });

    if (oid) void doFetchOffer(oid);
  };

  useEffect(() => {
    if (!recordId || configs.length === 0) return;
    if (handledRecordIdRef.current === recordId) return;
    handledRecordIdRef.current = recordId;

    // Reset stale issuance state before fetching the new record
    setOfferResult(null);
    setFetchedOffer(null);
    setTokenResult(null);
    setIssuedCredential(null);
    setPreAuthCode(null);
    setOfferId(null);
    setError(null);
    setActivityLog([]);
    setFetchedRecord(null);
    setVerifyResult(null);

    void getRecordById(recordId).then(({ data }) => {
      if (!data) return;
      setFetchedRecord(data);
      const configId = credentialConfigId || selectedId || configs[0]?.id || "";
      const cfg = configs.find((c) => c.id === configId)?.config;
      const builtClaims = buildIssuanceClaimsFromPersonRecord(data, configId, cfg?.displayOrder);
      setSelectedId(configId);
      setClaims(builtClaims);
      void handleGenerate(configId, builtClaims);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, configs]);

  const runExchangeToken = useCallback(async () => {
    if (!preAuthCode) {
      setError("Fetch credential offer first");
      return;
    }
    setStepLoading("token");
    setError(null);
    logActivity("Exchanging pre-authorized code for access token…", "pending");
    const { data, error: apiError } = await exchangePreAuthorizedCode({
      pre_authorized_code: preAuthCode,
      tx_code: useTxCode && txCode.trim() ? txCode.trim() : undefined,
    });
    setStepLoading(null);
    if (!data?.access_token) {
      setError(apiError ?? "Token exchange failed");
      logActivity(apiError ?? "Token exchange failed", "error");
      return;
    }
    setTokenResult(data);
    logActivity("Token exchange successful · access granted", "success");
  }, [preAuthCode, txCode, useTxCode]);

  const runIssueCredential = async () => {
    if (!tokenResult?.access_token || !tokenResult?.c_nonce) {
      setError("Complete token exchange first");
      return;
    }
    const cfg = selectedConfig;
    if (!cfg) {
      setError("No credential configuration selected");
      return;
    }
    setStepLoading("credential");
    setError(null);
    logActivity("Generating proof JWT and issuing credential…", "pending");
    try {
      const audUrl = await getCertifyIssuerUrl();
      const proofJwt = await generateProofJwt(tokenResult.c_nonce, audUrl);
      const { data, error: apiError } = await issueCredential({
        accessToken: tokenResult.access_token,
        format: cfg.credentialFormat ?? "ldp_vc",
        contextURLs: cfg.contextURLs ?? ["https://www.w3.org/2018/credentials/v1"],
        credentialTypes: cfg.credentialTypes ?? ["VerifiableCredential"],
        proofJwt,
      });
      setStepLoading(null);
      if (!data?.credential) {
        setError(apiError ?? "Credential issuance failed");
        logActivity(apiError ?? "Credential issuance failed", "error");
        return;
      }
      setIssuedCredential(data.credential);
      setVerifyResult(null);
      logActivity("Verifiable credential issued successfully", "success");

      setVerifying(true);
      logActivity("Verifying issued credential…", "pending");
      const verifyRes = await verifyCredential({
        verifiableCredential: JSON.stringify(data.credential),
      });
      setVerifying(false);
      if (verifyRes.data && !verifyRes.error) {
        setVerifyResult({ success: true, message: "Credential verified successfully" });
        logActivity("Credential verification passed", "success");
      } else {
        setVerifyResult({ success: false, message: verifyRes.error ?? "Verification failed" });
        logActivity(verifyRes.error ?? "Verification failed", "error");
      }
    } catch (e) {
      setStepLoading(null);
      const msg = e instanceof Error ? e.message : "Credential issuance failed";
      setError(msg);
      logActivity(msg, "error");
    }
  };

  const downloadCredential = () => {
    if (!issuedCredential) return;
    const blob = new Blob([JSON.stringify(issuedCredential, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credential-${selectedId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const claimKeys = selectedConfig?.displayOrder?.length
    ? ["id", "personId", ...selectedConfig.displayOrder].filter((k, i, a) => a.indexOf(k) === i)
    : Object.keys(claims);

  /* line progress: 4 nodes, 3 segments; line spans 12.5%→87.5% of container */
  const lineProgressPct = Math.min(75, (completedSteps / 3) * 75);

  /* ── JSX ─────────────────────────────────────────────────────────────── */
  return (
    <div className="px-4 lg:px-8 py-7 space-y-7 w-full">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] uppercase text-primary bg-primary/8 px-2.5 py-1 rounded-full border border-primary/15">
              <Sparkles className="h-2.5 w-2.5" /> OpenID4VCI
            </span>
            <span className="text-[11px] text-muted-foreground">Pre-authorized code flow</span>
          </div>
          <h1 className="text-[1.65rem] font-semibold tracking-tight">Issue Credential</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Guided issuance workflow · steps 1–4 match the Postman pre-auth collection
          </p>
        </div>
        <Link
          to="/credentials"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1 shrink-0"
        >
          Manage configurations <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Connected stepper ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-soft">
        <div className="relative flex items-start">
          {/* Background line */}
          <div
            className="absolute top-[17px] h-[2px] bg-border rounded-full"
            style={{ left: "12.5%", width: "75%" }}
          />
          {/* Progress line */}
          <div
            className="absolute top-[17px] h-[2px] rounded-full transition-all duration-700 ease-out"
            style={{
              left: "12.5%",
              width: `${lineProgressPct}%`,
              background: "var(--color-success)",
            }}
          />

          {FLOW_STEPS.map((s) => {
            const status = stepStatus(s.n);
            const Icon = s.icon;
            return (
              <div key={s.n} className="flex-1 flex flex-col items-center gap-2.5 relative">
                {/* Node */}
                <div
                  className={cn(
                    "relative w-[34px] h-[34px] rounded-full flex items-center justify-center z-10 transition-all duration-500 text-sm font-bold",
                    status === "done" &&
                      "bg-success text-white shadow-[0_0_0_3px_oklch(0.7_0.16_162/0.2)]",
                    status === "active" &&
                      "bg-primary text-white shadow-[0_0_0_3px_oklch(0.55_0.22_264/0.25)]",
                    status === "pending" && "bg-card border-2 border-border text-muted-foreground",
                    status === "idle" &&
                      "bg-muted border border-border/60 text-muted-foreground/60",
                  )}
                >
                  {status === "active" && (
                    <div className="absolute -inset-1 rounded-full bg-primary/20 animate-ping" />
                  )}
                  {status === "done" ? (
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Labels */}
                <div className="text-center px-1">
                  <p
                    className={cn(
                      "text-[11px] font-semibold leading-tight",
                      status === "done" && "text-foreground",
                      status === "active" && "text-primary",
                      status === "pending" && "text-muted-foreground",
                      status === "idle" && "text-muted-foreground/50",
                    )}
                  >
                    {s.label}
                  </p>
                  <p className="text-[9px] font-mono text-muted-foreground/60 mt-0.5 hidden sm:block leading-relaxed">
                    {s.api}
                  </p>
                  <div className="mt-1 h-4 flex items-center justify-center">
                    {status === "done" && (
                      <span className="text-[9px] text-success font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Done
                      </span>
                    )}
                    {status === "active" && (
                      <span className="text-[9px] text-primary font-semibold flex items-center gap-0.5">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Active
                      </span>
                    )}
                    {status === "pending" && (
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Issuance context banner ──────────────────────────────────────── */}
      {(isConfigLocked || fetchedRecord) && (
        <IssuanceContextBanner
          config={selectedConfig}
          configId={selectedId}
          record={fetchedRecord}
          isConfigLocked={isConfigLocked}
        />
      )}

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_384px] gap-6 items-start">
        {/* ── LEFT: Form + activity log ──────────────────────────────────── */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            {/* Card header */}
            <div className="px-7 pt-6 pb-5 border-b border-border flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                <Send className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold leading-tight">Configure Credential</h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Define the credential type, validity period, and holder identity claims
                </p>
              </div>
            </div>

            <div className="px-7 py-6 space-y-7">
              {/* ── Section: Credential Settings ─────────────────────────── */}
              <div className="space-y-4">
                <SectionDivider label="Credential Settings" />

                <Field label="Credential type">
                  {isConfigLocked ? (
                    <ConfigLockedDisplay config={selectedConfig} configId={selectedId} />
                  ) : (
                    <select
                      value={selectedId}
                      onChange={(e) => onConfigChange(e.target.value)}
                      className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    >
                      {configs.length === 0 && <option value="">Loading configurations…</option>}
                      {configs.map(({ id, config }) => (
                        <option key={id} value={id}>
                          {config.metaDataDisplay?.[0]?.name ?? id}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>

              {/* ── Section: Holder Claims / Identity ────────────────────── */}
              <div className="space-y-4">
                <SectionDivider label={fetchedRecord ? "Holder Identity" : "Holder Claims"} />
                {fetchedRecord ? (
                  <HolderIdentityCard record={fetchedRecord} />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {claimKeys.map((key) => (
                      <div key={key}>
                        <Label className="text-[11px] font-mono text-muted-foreground mb-1 block">
                          {key}
                        </Label>
                        <Input
                          value={claims[key] ?? ""}
                          onChange={(e) => setClaims((c) => ({ ...c, [key]: e.target.value }))}
                          className="h-9 text-sm font-mono rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Error ─────────────────────────────────────────────────── */}
              {error && (
                <div className="flex items-start gap-2.5 text-sm text-destructive bg-destructive/6 border border-destructive/20 rounded-xl px-4 py-3">
                  <span className="font-medium">Error:</span> {error}
                </div>
              )}
            </div>

            {/* Card footer CTA */}
            <div className="px-7 pb-7">
              <Button
                type="button"
                disabled={loading || !selectedId}
                onClick={() => void handleGenerate()}
                className="h-11 w-full rounded-xl text-sm font-semibold gap-2.5 bg-gradient-brand text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating secure credential offer…
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4" /> Generate Credential Offer
                  </>
                )}
              </Button>
            </div>
          </section>

          {/* ── Activity log ──────────────────────────────────────────── */}
          {activityLog.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Activity Log
              </h3>
              <div className="space-y-2">
                {activityLog.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-2.5 text-[11px]">
                    <span className="text-muted-foreground/60 font-mono shrink-0 mt-px">
                      {evt.time}
                    </span>
                    <span
                      className={cn(
                        "leading-snug",
                        evt.type === "success" && "text-success",
                        evt.type === "error" && "text-destructive",
                        evt.type === "pending" && "text-primary",
                        evt.type === "info" && "text-foreground/80",
                      )}
                    >
                      {evt.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Live sidebar ──────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-[88px] h-fit">
          {/* ── QR Code ───────────────────────────────────────────────── */}
          {qrDataUrl && offerResult && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <QrCode className="h-3.5 w-3.5 text-primary" /> Credential Offer
              </h3>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-2xl border border-border shadow-soft inline-block">
                  <img
                    src={qrDataUrl}
                    alt="Credential offer QR"
                    width={200}
                    height={200}
                    className="rounded-lg"
                  />
                </div>
              </div>
              {offerId && (
                <CopyRow label="offer_id" value={offerId} copiedKey={copiedKey} onCopy={copyText} />
              )}
              <CopyTextarea
                label="credential_offer_uri"
                value={offerResult.credential_offer_uri}
                copiedKey={copiedKey}
                onCopy={copyText}
              />
            </div>
          )}

          {/* ── Exchange for token ────────────────────────────────────── */}
          {fetchedOffer && !tokenResult && (
            <div className="rounded-2xl border border-primary/20 bg-primary/4 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Wallet offer fetched</h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Exchange the pre-authorized code for an access token to proceed.
                  </p>
                </div>
              </div>
              {preAuthCode && (
                <CopyRow
                  label="pre-authorized_code"
                  value={preAuthCode}
                  copiedKey={copiedKey}
                  onCopy={copyText}
                />
              )}
              <Button
                onClick={() => void runExchangeToken()}
                disabled={stepLoading === "token"}
                className="w-full h-10 rounded-xl text-sm font-semibold gap-2"
              >
                {stepLoading === "token" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Exchanging token…
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" /> Exchange for Token
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ── Record ready to issue ─────────────────────────────────── */}
          {!!tokenResult && !issuedCredential && (
            <div className="rounded-2xl overflow-hidden border border-success/20 shadow-soft">
              <div className="bg-gradient-to-br from-success/6 via-primary/4 to-trust/5 p-5 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-[15px]">Record is ready to issue</h3>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    Token exchange successful · JWT proof will be generated automatically
                  </p>
                </div>
                <Button
                  onClick={() => void runIssueCredential()}
                  disabled={stepLoading === "credential"}
                  className="w-full h-11 rounded-xl font-semibold gap-2 bg-gradient-brand text-primary-foreground shadow-soft hover:opacity-90 transition-opacity"
                >
                  {stepLoading === "credential" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Issuing credential…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Issue Credentials
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── Credential issued ─────────────────────────────────────── */}
          {issuedCredential !== null && (
            <div className="rounded-2xl border border-success/25 bg-card shadow-soft overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-success/6 border-b border-success/15">
                <div className="w-7 h-7 rounded-lg bg-success/12 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-success">Credential Issued</p>
                  <p className="text-[10px] text-muted-foreground">
                    Verifiable credential created successfully
                  </p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <pre className="text-[9px] font-mono bg-muted/40 rounded-lg p-2.5 border border-border overflow-y-auto max-h-24 leading-snug text-foreground/80">
                  {JSON.stringify(issuedCredential, null, 2)}
                </pre>
                {(verifying || verifyResult) && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                      verifying && "bg-primary/6 text-primary border border-primary/20",
                      verifyResult?.success && "bg-success/8 text-success border border-success/20",
                      verifyResult &&
                        !verifyResult.success &&
                        "bg-destructive/8 text-destructive border border-destructive/20",
                    )}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> Verifying…
                      </>
                    ) : verifyResult?.success ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> {verifyResult.message}
                      </>
                    ) : (
                      <>
                        <span className="shrink-0 font-bold">✕</span> {verifyResult?.message}
                      </>
                    )}
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={downloadCredential}
                  className="w-full h-9 rounded-xl text-xs font-semibold gap-2 border-success/30 bg-background text-success hover:bg-success/10 hover:text-success hover:border-success/40"
                >
                  <Download className="h-3.5 w-3.5" /> Download Credential
                </Button>
              </div>
            </div>
          )}

          {/* ── Idle placeholder ──────────────────────────────────────── */}
          {!offerResult && !loading && (
            <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center space-y-2">
              <QrCode className="h-8 w-8 mx-auto text-border" />
              <p className="text-[13px] text-muted-foreground">
                Generate a credential offer to begin the issuance flow
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-foreground/90">
        {label}
        {hint && <span className="text-muted-foreground font-normal ml-1.5">· {hint}</span>}
      </Label>
      {children}
    </div>
  );
}

function CopyRow({
  label,
  value,
  copiedKey,
  onCopy,
}: {
  label: string;
  value: string;
  copiedKey: string | null;
  onCopy: (v: string, k: string) => void;
}) {
  const copied = copiedKey === label;
  return (
    <div>
      <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[11px] font-mono bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 truncate text-foreground/80">
          {value}
        </p>
        <button
          type="button"
          onClick={() => onCopy(value, label)}
          className={cn(
            "shrink-0 h-7 w-7 rounded-lg border flex items-center justify-center transition-all",
            copied
              ? "bg-success/10 border-success/30 text-success"
              : "border-border hover:bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

function CopyTextarea({
  label,
  value,
  copiedKey,
  onCopy,
}: {
  label: string;
  value: string;
  copiedKey: string | null;
  onCopy: (v: string, k: string) => void;
}) {
  const copied = copiedKey === label;
  return (
    <div>
      <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-1">
        {label}
      </p>
      <Textarea
        readOnly
        value={value}
        rows={3}
        className="font-mono text-[9.5px] resize-none rounded-xl bg-muted/40"
      />
      <button
        type="button"
        onClick={() => onCopy(value, label)}
        className={cn(
          "mt-1.5 text-[11px] inline-flex items-center gap-1.5 transition-colors",
          copied ? "text-success" : "text-primary hover:underline",
        )}
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" /> Copied!
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" /> Copy
          </>
        )}
      </button>
    </div>
  );
}

/* ─── Issuance context banner ───────────────────────────────────────────────── */

function IssuanceContextBanner({
  config,
  configId,
  record,
  isConfigLocked,
}: {
  config?: CredentialConfiguration;
  configId: string;
  record: RecordResponse | null;
  isConfigLocked: boolean;
}) {
  const configName = config?.metaDataDisplay?.[0]?.name ?? configId;
  const format = config?.credentialFormat?.toUpperCase().replace("_", "-") ?? "JWT-VC";
  const types = (config?.credentialTypes ?? []).filter((t) => t !== "VerifiableCredential");
  const initials = record
    ? [record.firstName?.[0], record.lastName?.[0]].filter(Boolean).join("").toUpperCase()
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft px-5 py-4 flex flex-col sm:flex-row gap-4 sm:items-center">
      {/* Credential config side */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Credential Configuration
          </p>
          <p className="text-sm font-semibold truncate">{configName}</p>
          <p className="text-[11px] font-mono text-muted-foreground truncate">
            {format}
            {types.length > 0 ? ` · ${types.join(", ")}` : ""}
          </p>
        </div>
        {isConfigLocked && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-full px-2 py-1 bg-secondary/60 shrink-0">
            <Lock className="h-2.5 w-2.5" /> Locked
          </span>
        )}
      </div>

      {record && (
        <>
          <div className="hidden sm:block h-10 w-px bg-border" />
          <div className="block sm:hidden h-px w-full bg-border" />

          {/* Holder record side */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-brand text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0 shadow-soft">
              {initials ?? <User className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Holder
              </p>
              <p className="text-sm font-semibold truncate">
                {record.firstName} {record.lastName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {record.email ?? record.phoneNumber ?? record.id}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-full px-2 py-1 bg-secondary/60 shrink-0">
              <Lock className="h-2.5 w-2.5" /> Record
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Holder Identity Card ──────────────────────────────────────────────────── */

function HolderIdentityCard({ record }: { record: RecordResponse }) {
  const initials = [record.firstName?.[0], record.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();
  const dob = normalizeRecordDateOfBirth(record.dateOfBirth);

  return (
    <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-brand text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0 shadow-soft">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold leading-snug">
              {record.firstName} {record.lastName}
            </p>
            {record.email && (
              <p className="text-[12px] text-muted-foreground truncate max-w-[220px]">
                {record.email}
              </p>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-full px-2.5 py-1 bg-card shrink-0">
          <Lock className="h-2.5 w-2.5" /> From record
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-px bg-border/40">
        {record.phoneNumber && <IdentityField label="Phone" value={record.phoneNumber} />}
        {record.gender && <IdentityField label="Gender" value={record.gender} />}
        {dob && <IdentityField label="Date of birth" value={dob} />}
      </div>

      {/* Record ID */}
      <div className="px-4 py-3 border-t border-border/60">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
          Record ID
        </p>
        <p className="text-[11px] font-mono text-foreground/70 break-all leading-relaxed">
          {record.id}
        </p>
      </div>
    </div>
  );
}

function IdentityField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="text-[12px] font-medium mt-0.5 truncate">{value}</p>
    </div>
  );
}

/* ─── Config Locked Display ─────────────────────────────────────────────────── */

function ConfigLockedDisplay({
  config,
  configId,
}: {
  config?: CredentialConfiguration;
  configId: string;
}) {
  const name = config?.metaDataDisplay?.[0]?.name ?? configId;
  const format = config?.credentialFormat?.toUpperCase().replace("_", "-") ?? "JWT-VC";
  const types = (config?.credentialTypes ?? []).filter((t) => t !== "VerifiableCredential");

  return (
    <div className="flex items-center gap-3 h-11 px-3 rounded-xl border border-border bg-secondary/40">
      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-[10px] font-mono text-muted-foreground truncate">
          {format}
          {types.length > 0 ? ` · ${types.join(", ")}` : ""}
        </p>
      </div>
      <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </div>
  );
}
