import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { shouldHideMockFarmerFromCredentialsList } from "@/lib/credential-config-defaults";
import { listCredentialConfigs } from "@/lib/credential-config-api";
import { ConfigPreviewCard } from "@/components/credentials/ConfigPreviewCard";
import type { CredentialConfiguration } from "@/types/credential-config";
import { Plus, Pencil, Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/credentials/")({
  head: () => ({ meta: [{ title: "Credential Configurations — Inji Certify" }] }),
  component: CredentialsIndexPage,
});

function CredentialsIndexPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<
    Array<{ id: string; config: CredentialConfiguration; fromApi: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);

  const loadConfigs = useCallback(() => {
    setLoading(true);
    listCredentialConfigs()
      .then((rows) =>
        setItems(
          rows.filter(({ id, config }) => !shouldHideMockFarmerFromCredentialsList(id, config)),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return (
    <div className="px-4 lg:px-8 py-8 space-y-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Credential configurations</h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Each card loads the latest definition from Certify using{" "}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl gap-2"
            disabled={loading}
            onClick={() => loadConfigs()}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh from Certify
          </Button>
          <Link to="/credentials/new">
            <Button className="h-10 rounded-xl bg-gradient-brand text-primary-foreground shadow-soft gap-2">
              <Plus className="h-4 w-4" /> New configuration
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading configurations…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No configurations yet.</p>
          <Link
            to="/credentials/new"
            className="inline-block mt-4 text-primary text-sm hover:underline"
          >
            Create your first configuration
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(({ id, config, fromApi }) => {
            const meta = config.metaDataDisplay?.[0];
            return (
              <div
                key={id}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-elevated transition"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => void navigate({ to: "/records", search: { credentialConfigId: id } })}
                >
                  <div className="p-4 pb-0">
                    <ConfigPreviewCard config={config} />
                  </div>
                  <div className="px-5 pt-4 pb-4 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">
                          {meta?.name ?? config.credentialConfigKeyId}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                          {id}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium shrink-0 ${
                          fromApi ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        }`}
                        title={fromApi ? "Loaded from certify API" : "Cached locally (API offline)"}
                      >
                        {fromApi ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
                        {fromApi ? "Live" : "Local"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <Stat label="Format" value={config.credentialFormat ?? "—"} />
                      <Stat label="Scope" value={config.scope?.slice(0, 8) ?? "—"} />
                      <Stat label="Claims" value={String(config.displayOrder?.length ?? 0)} />
                    </div>
                  </div>
                </button>
                <div className="px-5 pb-5">
                  <Link
                    to="/credentials/$id"
                    params={{ id }}
                    className="w-full h-9 rounded-lg border border-border text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-secondary transition"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit configuration
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary py-2 px-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono font-medium mt-0.5 truncate">{value}</p>
    </div>
  );
}
