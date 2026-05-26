import { createFileRoute } from "@tanstack/react-router";
import { Upload, ShieldCheck, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { verifyCredential } from "@/lib/verify-api";
import { parseCredentialInput, readCredentialFile } from "@/lib/vc-parse";
import type { ParsedCredentialMeta, StatusCheck, VCVerificationResult } from "@/types/verification";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/verify")({
  head: () => ({ meta: [{ title: "Verify Credential — Inji Certify" }] }),
  component: VerifyPage,
});

type CheckRow = {
  label: string;
  status: "pending" | "valid" | "invalid" | "skipped";
  detail?: string;
};

function VerifyPage() {
  const [uploadText, setUploadText] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);

  const [skipStatusChecks, setSkipStatusChecks] = useState(false);
  const [checkRevocation, setCheckRevocation] = useState(true);
  const [includeClaims, setIncludeClaims] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VCVerificationResult | null>(null);
  const [meta, setMeta] = useState<ParsedCredentialMeta | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const resolveInput = useCallback(async (): Promise<string> => {
    if (!uploadText) throw new Error("Upload a .json file first");
    return uploadText;
  }, [uploadText]);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setMeta(null);
    setElapsedMs(null);

    const started = performance.now();
    try {
      const raw = await resolveInput();
      const { vc, meta: parsedMeta } = parseCredentialInput(raw);
      setMeta(parsedMeta);

      const {
        data,
        error: apiError,
        status,
      } = await verifyCredential({
        verifiableCredential: JSON.stringify(vc),
        skipStatusChecks,
        statusCheckFilters: skipStatusChecks || !checkRevocation ? undefined : ["revocation"],
        includeClaims,
      });

      setElapsedMs(Math.round(performance.now() - started));

      if (apiError && !data) {
        const hint =
          status === 0 ? " Is inji-verify running on port 8095? (docker-compose injistack)" : "";
        setError(`${apiError}${hint}`);
        return;
      }

      if (data) setResult(data);
      if (apiError) setError(apiError);
    } catch (e) {
      setElapsedMs(Math.round(performance.now() - started));
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readCredentialFile(file);
      setUploadText(text);
      setUploadName(file.name);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read file");
    }
  };

  const checkRows = buildCheckRows(result, skipStatusChecks, checkRevocation);
  const overallValid = result?.allChecksSuccessful === true;
  const hasResult = result !== null;

  return (
    <div className="px-4 lg:px-8 py-8 w-full space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Verification Console</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Verify a Credential</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          Validates signature, schema, expiry, and revocation via digitalhealth-verify{" "}
          <code className="text-xs bg-secondary px-1 rounded">POST /v2/vc-verification</code>.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Upload VC</p>
              <p className="text-xs text-muted-foreground">.json, JWT text, or JSON-LD</p>
            </div>
          </div>

          <div>
            <input
                ref={fileRef}
                type="file"
                accept=".json,.jwt,.txt,application/json"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
            />
            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/40 transition"
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="mt-3 text-sm font-medium">
                {uploadName ? uploadName : "Drop or browse a VC file"}
              </p>
                <p className="text-xs text-muted-foreground">Click to select a credential file</p>
              </button>
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-border bg-background/50 p-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={skipStatusChecks}
                onChange={(e) => setSkipStatusChecks(e.target.checked)}
                className="rounded border-border"
              />
              Skip status checks
            </label>
            <label
              className={cn(
                "flex items-center gap-2 text-xs",
                skipStatusChecks ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                checked={checkRevocation}
                disabled={skipStatusChecks}
                onChange={(e) => setCheckRevocation(e.target.checked)}
                className="rounded border-border"
              />
              Status filter: revocation
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={includeClaims}
                onChange={(e) => setIncludeClaims(e.target.checked)}
                className="rounded border-border"
              />
              Include claims in response
            </label>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={loading}
            className="mt-4 w-full h-11 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2 shadow-elevated disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {loading ? "Verifying…" : "Verify Credential"}
          </button>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!hasResult && !loading && (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Upload a VC file and run verification. Results appear here from inji-verify.
            </div>
          )}

          {hasResult && (
            <div
              className={cn(
                "rounded-2xl border p-6",
                overallValid
                  ? "border-success/30 bg-success/5"
                  : "border-destructive/30 bg-destructive/5",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center",
                    overallValid
                      ? "bg-success text-success-foreground"
                      : "bg-destructive text-destructive-foreground",
                  )}
                >
                  {overallValid ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {overallValid ? "Credential is valid" : "Verification failed"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {elapsedMs != null ? `Completed in ${elapsedMs}ms` : ""}
                    {result.allChecksSuccessful === false && " — one or more checks failed"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasResult && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="font-semibold tracking-tight text-sm">Verification checks</h3>
              <div className="mt-3 space-y-2">
                {checkRows.map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-4"
                  >
                    <div>
                      <p className="text-sm">{c.label}</p>
                      {c.detail && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[240px] truncate">
                          {c.detail}
                        </p>
                      )}
                    </div>
                    <CheckBadge status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {(meta?.issuer || result?.claims) && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="font-semibold tracking-tight text-sm mb-3">Issuer & claims</h3>
              {meta?.issuer && (
                <p className="text-xs font-mono break-all text-muted-foreground mb-3">
                  Issuer: {meta.issuer}
                </p>
              )}
              {meta?.types && meta.types.length > 0 && (
                <p className="text-xs text-muted-foreground mb-3">Types: {meta.types.join(", ")}</p>
              )}
              {result?.claims && Object.keys(result.claims).length > 0 ? (
                <pre className="text-[11px] font-mono bg-secondary rounded-lg p-3 overflow-auto max-h-48">
                  {JSON.stringify(result.claims, null, 2)}
                </pre>
              ) : meta?.subject ? (
                <pre className="text-[11px] font-mono bg-secondary rounded-lg p-3 overflow-auto max-h-48">
                  {JSON.stringify(meta.subject, null, 2)}
                </pre>
              ) : null}
            </div>
          )}

          {meta?.issuer && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="font-semibold tracking-tight text-sm mb-3">
                Issuer (from credential)
              </h3>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary">
                <div className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono break-all">{meta.issuer}</p>
                  <p className="text-[10px] text-muted-foreground">Resolved from VC document</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckBadge({ status }: { status: CheckRow["status"] }) {
  if (status === "pending") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (status === "skipped") {
    return <span className="text-xs text-muted-foreground">Skipped</span>;
  }
  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
      <XCircle className="h-3.5 w-3.5" /> Failed
    </span>
  );
}

function buildCheckRows(
  result: VCVerificationResult | null,
  skipStatus: boolean,
  checkRevocation: boolean,
): CheckRow[] {
  if (!result) {
    return [
      { label: "Schema & signature", status: "pending" },
      { label: "Expiry", status: "pending" },
      { label: "Revocation status", status: "pending" },
    ];
  }

  const sig = result.schemaAndSignatureCheck;
  const exp = result.expiryCheck;
  const statusChecks = result.statusCheck ?? [];

  const rows: CheckRow[] = [
    {
      label: "Schema & signature",
      status: sig?.valid ? "valid" : "invalid",
      detail: sig?.error?.errorMessage ?? sig?.error?.errorCode,
    },
    {
      label: "Expiry",
      status: exp?.valid ? "valid" : "invalid",
    },
  ];

  if (skipStatus) {
    rows.push({ label: "Status checks", status: "skipped" });
  } else if (!checkRevocation) {
    rows.push({ label: "Revocation status", status: "skipped" });
  } else {
    const revocation = statusChecks.find(
      (s: StatusCheck) => s.purpose?.toLowerCase() === "revocation",
    );
    if (revocation) {
      rows.push({
        label: "Revocation status",
        status: revocation.valid ? "valid" : "invalid",
        detail: revocation.error?.errorMessage ?? revocation.error?.errorCode,
      });
    } else {
      for (const s of statusChecks) {
        rows.push({
          label: s.purpose || "Status check",
          status: s.valid ? "valid" : "invalid",
          detail: s.error?.errorMessage ?? s.error?.errorCode,
        });
      }
      if (statusChecks.length === 0) {
        rows.push({ label: "Revocation status", status: "invalid", detail: "No status result" });
      }
    }
  }

  return rows;
}
