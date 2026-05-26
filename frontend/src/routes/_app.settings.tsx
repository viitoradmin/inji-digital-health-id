import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  Activity,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  Server,
  Trash2,
  XCircle,
  Settings2,
  Send,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  checkCertifyHealth,
  checkVerifyHealth,
  clearIssuanceHistory,
  clearLocalConfigCache,
  getApiEndpoints,
  loadConfigSummaries,
  loadWorkspaceStats,
  type ConfigSummary,
  type ServiceHealth,
  type WorkspaceStats,
} from "@/lib/settings-insights";
import { listCredentialConfigs } from "@/lib/credential-config-api";
import { loadIssuanceHistory } from "@/lib/issuance-history";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Inji Certify" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [configs, setConfigs] = useState<ConfigSummary[]>([]);
  const [issuerDid, setIssuerDid] = useState<string | undefined>();
  const [health, setHealth] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingHealth, setRefreshingHealth] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [s, c, fullConfigs] = await Promise.all([
      loadWorkspaceStats(),
      loadConfigSummaries(),
      listCredentialConfigs(),
    ]);
    setStats(s);
    setConfigs(c);
    setIssuerDid(fullConfigs.find((x) => x.config.didUrl)?.config.didUrl);
    setLoading(false);
  }, []);

  const refreshHealth = useCallback(async () => {
    setRefreshingHealth(true);
    setHealth([
      { id: "certify", label: "Inji Certify", url: "", status: "checking" },
      { id: "verify", label: "Inji Verify", url: "", status: "checking" },
    ]);
    const [certify, verify] = await Promise.all([checkCertifyHealth(), checkVerifyHealth()]);
    setHealth([certify, verify]);
    setRefreshingHealth(false);
  }, []);

  useEffect(() => {
    void refresh();
    void refreshHealth();
  }, [refresh, refreshHealth]);

  const endpoints = getApiEndpoints();
  const history = loadIssuanceHistory().slice(0, 5);

  const handleClearHistory = () => {
    if (!confirm("Clear all issuance history stored in this browser?")) return;
    clearIssuanceHistory();
    void refresh();
  };

  const handleClearCache = () => {
    if (
      !confirm(
        "Clear local credential config cache? Registry keys will be removed; re-fetch from Certify on next visit.",
      )
    )
      return;
    clearLocalConfigCache();
    void refresh();
  };

  return (
    <div className="px-4 lg:px-8 py-8 space-y-8 w-full">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Workspace & services</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Live status of Certify and Verify, your local credential registry, and recent issuance
          activity from this browser session.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Configurations"
          value={loading ? "—" : String(stats?.configCount ?? 0)}
          sub={`${stats?.syncedWithApi ?? 0} synced with API`}
          icon={CreditCard}
        />
        <StatCard
          label="Offers generated"
          value={loading ? "—" : String(stats?.issuanceTotal ?? 0)}
          sub={`${stats?.issuanceLast7Days ?? 0} in last 7 days`}
          icon={Send}
        />
        <StatCard
          label="Cached offline"
          value={loading ? "—" : String(stats?.cachedOnly ?? 0)}
          sub="configs not on server"
          icon={Database}
        />
        <StatCard
          label="Last activity"
          value={stats?.lastIssuanceAt ? formatRelative(stats.lastIssuanceAt) : "—"}
          sub={stats?.lastIssuance?.credentialConfigurationId ?? "No issuances yet"}
          icon={Activity}
        />
      </div>

      {/* Service health */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-semibold tracking-tight flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Backend services
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Proxied through Vite in dev — Certify on 8090, Verify on 8095
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            onClick={() => void refreshHealth()}
            disabled={refreshingHealth}
          >
            {refreshingHealth ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {health.map((svc) => (
            <ServiceCard key={svc.id} service={svc} />
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Issuer & API */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-4">
          <h2 className="font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Issuer & API endpoints
          </h2>
          {issuerDid && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Primary issuer DID</p>
              <p className="text-xs font-mono break-all bg-secondary rounded-lg p-3">{issuerDid}</p>
            </div>
          )}
          {endpoints.map((ep) => (
            <div key={ep.service} className="border-t border-border pt-4 first:border-0 first:pt-0">
              <p className="text-sm font-medium">{ep.service}</p>
              <p className="text-[11px] font-mono text-muted-foreground mt-1">
                Dev proxy: {ep.proxy}
              </p>
              <p className="text-[11px] font-mono text-muted-foreground">Upstream: {ep.upstream}</p>
              <ul className="mt-2 space-y-1">
                {ep.paths.map((p) => (
                  <li key={p} className="text-xs text-muted-foreground font-mono">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Configurations insight */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold tracking-tight">Credential configurations</h2>
            <Link
              to="/credentials"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Manage <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : configs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No configurations in local registry.{" "}
              <Link to="/credentials/new" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {configs.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">
                      {c.id} · {c.format}
                    </p>
                  </div>
                  {c.fromApi ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-success shrink-0">
                      <Cloud className="h-3 w-3" /> API
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 shrink-0">
                      <CloudOff className="h-3 w-3" /> Local
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {stats && Object.keys(stats.formats).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Formats in registry</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.formats).map(([fmt, n]) => (
                  <span
                    key={fmt}
                    className="text-xs px-2 py-1 rounded-lg bg-background border border-border"
                  >
                    {fmt}: {n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent issuance */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold tracking-tight">Recent pre-authorized offers</h2>
          <Link
            to="/issuance"
            search={{ recordId: undefined, credentialConfigId: undefined }}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Open issuance <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No offers in browser history. Generate one on the Issuance page.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium">When</th>
                  <th className="pb-2 pr-4 font-medium">Configuration</th>
                  <th className="pb-2 pr-4 font-medium">Offer ID</th>
                  <th className="pb-2 font-medium">Expires in</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelative(r.createdAt)}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{r.credentialConfigurationId}</td>
                    <td className="py-3 pr-4 font-mono text-xs truncate max-w-[140px]">
                      {r.offerId ?? "—"}
                    </td>
                    <td className="py-3 text-xs">{r.expiresIn}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Local data */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-semibold tracking-tight flex items-center gap-2 mb-2">
          <Settings2 className="h-4 w-4 text-primary" />
          Local browser data
        </h2>
        <p className="text-xs text-muted-foreground mb-4 max-w-xl">
          Configurations and issuance history are stored in localStorage for offline demos. Clearing
          does not delete data on the Certify server.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2 text-destructive hover:text-destructive"
            onClick={handleClearHistory}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear issuance history
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2 text-destructive hover:text-destructive"
            onClick={handleClearCache}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear config cache
          </Button>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/credentials/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-sm hover:bg-secondary transition"
        >
          <CreditCard className="h-4 w-4 text-primary" /> New configuration
        </Link>
        <Link
          to="/issuance"
          search={{ recordId: undefined, credentialConfigId: undefined }}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-sm hover:bg-secondary transition"
        >
          <Send className="h-4 w-4 text-primary" /> Issue credential
        </Link>
        <Link
          to="/verify"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-sm hover:bg-secondary transition"
        >
          <ShieldCheck className="h-4 w-4 text-primary" /> Verify credential
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <Icon className="h-4 w-4 text-primary mb-3" />
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  const checking = service.status === "checking";
  const online = service.status === "online";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        checking && "border-border bg-secondary/30",
        online && "border-success/30 bg-success/5",
        !checking && !online && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            checking && "bg-secondary",
            online && "bg-success/20 text-success",
            !checking && !online && "bg-destructive/20 text-destructive",
          )}
        >
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : online ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{service.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {service.detail ?? (checking ? "Checking…" : "Unknown")}
          </p>
          {service.latencyMs != null && (
            <p className="text-[10px] text-muted-foreground mt-1">{service.latencyMs}ms</p>
          )}
          {service.url && (
            <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
              {service.url}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
