import { useMemo, useState } from "react";
import { decodeVcTemplate, encodeVcTemplate } from "@/lib/credential-config-api";
import type { CredentialConfiguration } from "@/types/credential-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfigPreviewCard } from "@/components/credentials/ConfigPreviewCard";
import { Loader2 } from "lucide-react";

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function arrayToLines(arr?: string[]): string {
  return arr?.join("\n") ?? "";
}

type Props = {
  initial: CredentialConfiguration;
  onSubmit: (config: CredentialConfiguration) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  keyIdReadOnly?: boolean;
};

export function CredentialConfigForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save configuration",
  keyIdReadOnly = false,
}: Props) {
  const [config, setConfig] = useState<CredentialConfiguration>(() => structuredClone(initial));
  const [templateJson, setTemplateJson] = useState(() => decodeVcTemplate(initial.vcTemplate));
  const [rawJson, setRawJson] = useState(() => JSON.stringify(initial, null, 2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = config.metaDataDisplay?.[0] ?? {};

  const updateMeta = (patch: Partial<NonNullable<typeof meta>>) => {
    setConfig((c) => ({
      ...c,
      metaDataDisplay: [{ ...meta, ...patch }],
    }));
  };

  const syncTemplateToConfig = () => {
    try {
      JSON.parse(templateJson);
      setConfig((c) => ({ ...c, vcTemplate: encodeVcTemplate(templateJson) }));
    } catch {
      setError("VC template JSON is invalid");
    }
  };

  const applyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJson) as CredentialConfiguration;
      setConfig(parsed);
      setTemplateJson(decodeVcTemplate(parsed.vcTemplate));
      setError(null);
    } catch {
      setError("Invalid JSON in advanced editor");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    syncTemplateToConfig();
    const payload: CredentialConfiguration = {
      ...config,
      vcTemplate: encodeVcTemplate(templateJson),
    };
    if (!payload.credentialConfigKeyId?.trim()) {
      setError("Credential configuration key ID is required");
      return;
    }
    if (!payload.credentialFormat?.trim()) {
      setError("Credential format is required");
      return;
    }
    if (!payload.scope?.trim()) {
      setError("Scope is required");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const pluginJson = useMemo(
    () => JSON.stringify(config.pluginConfigurations ?? [], null, 2),
    [config.pluginConfigurations],
  );
  const qrJson = useMemo(
    () => JSON.stringify(config.qrSettings ?? [], null, 2),
    [config.qrSettings],
  );
  const subjectJson = useMemo(
    () => JSON.stringify(config.credentialSubjectDefinition ?? {}, null, 2),
    [config.credentialSubjectDefinition],
  );

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-8">
      <div className="space-y-6">
        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary p-1">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
            <TabsTrigger value="display">Wallet display</TabsTrigger>
            <TabsTrigger value="claims">Claims & QR</TabsTrigger>
            <TabsTrigger value="plugins">Plugins</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <TabsContent
            value="identity"
            className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <Field label="Configuration key ID" hint="credentialConfigKeyId — used in API path">
              <Input
                value={config.credentialConfigKeyId ?? ""}
                readOnly={keyIdReadOnly}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, credentialConfigKeyId: e.target.value }))
                }
                className="font-mono"
                placeholder="FarmerCredential"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Credential format">
                <Input
                  value={config.credentialFormat ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, credentialFormat: e.target.value }))}
                  placeholder="ldp_vc"
                />
              </Field>
              <Field label="Scope">
                <Input
                  value={config.scope ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, scope: e.target.value }))}
                  placeholder="mock_identity_vc_ldp"
                />
              </Field>
            </div>
            <Field label="Issuer DID URL">
              <Input
                value={config.didUrl ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, didUrl: e.target.value }))}
                className="font-mono text-sm"
              />
            </Field>
            <Field label="Context URLs" hint="One URL per line">
              <Textarea
                rows={3}
                value={arrayToLines(config.contextURLs)}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, contextURLs: linesToArray(e.target.value) }))
                }
                className="font-mono text-sm"
              />
            </Field>
            <Field label="Credential types" hint="One type per line">
              <Textarea
                rows={3}
                value={arrayToLines(config.credentialTypes)}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    credentialTypes: linesToArray(e.target.value),
                  }))
                }
                className="font-mono text-sm"
              />
            </Field>
            <Field label="Status purposes" hint="Comma-separated">
              <Input
                value={config.credentialStatusPurposes?.join(", ") ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    credentialStatusPurposes: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </Field>
          </TabsContent>

          <TabsContent
            value="template"
            className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <Field
              label="VC template (JSON)"
              hint="Stored as base64 in vcTemplate. Edit JSON below; saved on submit."
            >
              <Textarea
                rows={14}
                value={templateJson}
                onChange={(e) => setTemplateJson(e.target.value)}
                onBlur={syncTemplateToConfig}
                className="font-mono text-xs"
              />
            </Field>
          </TabsContent>

          <TabsContent
            value="crypto"
            className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Key manager app ID">
                <Input
                  value={config.keyManagerAppId ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, keyManagerAppId: e.target.value }))}
                />
              </Field>
              <Field label="Key manager ref ID">
                <Input
                  value={config.keyManagerRefId ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, keyManagerRefId: e.target.value }))}
                />
              </Field>
              <Field label="Signature algorithm">
                <Input
                  value={config.signatureAlgo ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, signatureAlgo: e.target.value }))}
                />
              </Field>
              <Field label="Signature crypto suite">
                <Input
                  value={config.signatureCryptoSuite ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, signatureCryptoSuite: e.target.value }))
                  }
                />
              </Field>
              <Field label="QR signature algorithm">
                <Input
                  value={config.qrSignatureAlgo ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, qrSignatureAlgo: e.target.value }))}
                />
              </Field>
            </div>
          </TabsContent>

          <TabsContent
            value="display"
            className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <Field label="Wallet card name">
              <Input
                value={meta.name ?? ""}
                onChange={(e) => updateMeta({ name: e.target.value })}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Text color">
                <Input
                  value={meta.text_color ?? ""}
                  onChange={(e) => updateMeta({ text_color: e.target.value })}
                />
              </Field>
              <Field label="Background color">
                <Input
                  value={meta.background_color ?? ""}
                  onChange={(e) => updateMeta({ background_color: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Logo URL">
              <Input
                value={meta.logo?.url ?? ""}
                onChange={(e) => updateMeta({ logo: { ...meta.logo, url: e.target.value } })}
              />
            </Field>
            <Field label="Logo alt text">
              <Input
                value={meta.logo?.alt_text ?? ""}
                onChange={(e) => updateMeta({ logo: { ...meta.logo, alt_text: e.target.value } })}
              />
            </Field>
            <Field label="Background image URI">
              <Input
                value={meta.background_image?.uri ?? ""}
                onChange={(e) =>
                  updateMeta({
                    background_image: { uri: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Display order" hint="One claim key per line">
              <Textarea
                rows={6}
                value={arrayToLines(config.displayOrder)}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    displayOrder: linesToArray(e.target.value),
                  }))
                }
                className="font-mono text-sm"
              />
            </Field>
          </TabsContent>

          <TabsContent
            value="claims"
            className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <Field label="credentialSubjectDefinition (JSON)">
              <Textarea
                rows={10}
                className="font-mono text-xs"
                defaultValue={subjectJson}
                key={subjectJson}
                onBlur={(e) => {
                  try {
                    setConfig((c) => ({
                      ...c,
                      credentialSubjectDefinition: JSON.parse(e.target.value),
                    }));
                  } catch {
                    setError("Invalid credentialSubjectDefinition JSON");
                  }
                }}
              />
            </Field>
            <Field label="qrSettings (JSON array)">
              <Textarea
                rows={6}
                className="font-mono text-xs"
                defaultValue={qrJson}
                key={qrJson}
                onBlur={(e) => {
                  try {
                    setConfig((c) => ({
                      ...c,
                      qrSettings: JSON.parse(e.target.value),
                    }));
                  } catch {
                    setError("Invalid qrSettings JSON");
                  }
                }}
              />
            </Field>
          </TabsContent>

          <TabsContent
            value="plugins"
            className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <Field label="pluginConfigurations (JSON array)">
              <Textarea
                rows={12}
                className="font-mono text-xs"
                defaultValue={pluginJson}
                key={pluginJson}
                onBlur={(e) => {
                  try {
                    setConfig((c) => ({
                      ...c,
                      pluginConfigurations: JSON.parse(e.target.value),
                    }));
                  } catch {
                    setError("Invalid pluginConfigurations JSON");
                  }
                }}
              />
            </Field>
          </TabsContent>

          <TabsContent
            value="json"
            className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <p className="text-sm text-muted-foreground">
              Full POST body for{" "}
              <code className="text-xs bg-secondary px-1 rounded">/credential-configurations</code>
            </p>
            <Textarea
              rows={18}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              className="font-mono text-xs"
            />
            <Button type="button" variant="secondary" onClick={applyRawJson}>
              Apply JSON to form
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="h-10 px-5 rounded-xl bg-gradient-brand text-primary-foreground shadow-soft"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              submitLabel
            )}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Wallet preview
        </p>
        <ConfigPreviewCard config={config} />
        <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-2">
          <Row k="Format" v={config.credentialFormat} />
          <Row k="Scope" v={config.scope} />
          <Row k="Types" v={config.credentialTypes?.length?.toString()} />
          <Row k="Display fields" v={config.displayOrder?.length?.toString()} />
        </div>
      </aside>
    </form>
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
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-foreground">{v ?? "—"}</span>
    </div>
  );
}
