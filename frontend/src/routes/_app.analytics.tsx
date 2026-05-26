import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  FileCheck2,
  Loader2,
  Send,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { loadAnalyticsSnapshot, type AnalyticsSnapshot } from "@/lib/analytics-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Inji Certify" }] }),
  component: AnalyticsPage,
});

const issuanceChartConfig = {
  offers: { label: "Pre-auth offers", color: "hsl(264 70% 52%)" },
};

const verificationChartConfig = {
  success: { label: "Passed", color: "hsl(152 55% 42%)" },
  failed: { label: "Failed", color: "hsl(0 72% 55%)" },
};

function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsSnapshot()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading analytics…
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="px-4 lg:px-8 py-8 space-y-8 w-full">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Analytics</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Issuer insights</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Issuance volume, configuration mix, and verification trends. Combines browser issuance
          history with demo baselines when no local data exists yet.
        </p>
        {data.usingDemoBaseline && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Showing demo baselines — generate offers on Issuance to reflect your activity.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Offers (7 days)"
          value={String(data.offersThisWeek)}
          hint="Pre-authorized codes"
          icon={Send}
          delta="+8.2%"
        />
        <StatCard
          label="Active configurations"
          value={String(data.activeConfigs)}
          hint="In local registry"
          icon={FileCheck2}
        />
        <StatCard
          label="Verification success"
          value={`${data.verifySuccessRate}%`}
          hint="Last 7 days (demo)"
          icon={ShieldCheck}
          delta="+0.6%"
        />
        <StatCard
          label="VC conversion"
          value={data.funnel[3]?.rate ?? "—"}
          hint="Offer → credential"
          icon={Activity}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Issuance volume" subtitle="Pre-authorized offers per day">
          <ChartContainer config={issuanceChartConfig} className="h-[280px] w-full">
            <AreaChart data={data.issuanceSeries} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="offers"
                stroke="var(--color-offers)"
                fill="var(--color-offers)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Verification outcomes" subtitle="Passed vs failed checks">
          <ChartContainer config={verificationChartConfig} className="h-[280px] w-full">
            <BarChart
              data={data.verificationSeries}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="success"
                stackId="v"
                fill="var(--color-success)"
                radius={[0, 0, 0, 0]}
              />
              <Bar dataKey="failed" stackId="v" fill="var(--color-failed)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <ChartCard
          title="By configuration"
          subtitle="Offers per credential type"
          className="lg:col-span-2"
        >
          <ChartContainer config={issuanceChartConfig} className="h-[260px] w-full">
            <BarChart
              data={data.configBreakdown}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={120}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="offers" fill="var(--color-offers)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="VC formats" subtitle="Active configuration mix">
          <ChartContainer config={issuanceChartConfig} className="h-[260px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="format" />} />
              <Pie
                data={data.formatBreakdown}
                dataKey="count"
                nameKey="format"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.formatBreakdown.map((entry) => (
                  <Cell key={entry.format} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="mt-2 space-y-1.5 px-1">
            {data.formatBreakdown.map((f) => (
              <li key={f.format} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: f.fill }}
                  />
                  <span className="font-mono">{f.format}</span>
                </span>
                <span className="text-muted-foreground">{f.count}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Issuance funnel
          </h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Pre-auth → offer fetch → token → VC (estimated from session data)
          </p>
          <ul className="space-y-4">
            {data.funnel.map((step) => {
              const max = data.funnel[0]?.count ?? 1;
              const pct = Math.round((step.count / max) * 100);
              return (
                <li key={step.step}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>{step.step}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {step.count.toLocaleString()} · {step.rate}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-semibold tracking-tight">Quick actions</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Drive metrics from real workflows in this console.
          </p>
          <div className="space-y-2">
            <ActionLink
              to="/issuance"
              label="Generate pre-auth offer"
              desc="Increases issuance volume"
            />
            <ActionLink
              to="/verify"
              label="Run VC verification"
              desc="Updates verification stats"
            />
            <ActionLink to="/credentials" label="Manage configurations" desc="Changes format mix" />
            <ActionLink to="/settings" label="Service health" desc="Certify & Verify status" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Activity;
  delta?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {delta && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
            <TrendingUp className="h-3 w-3" /> {delta}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-6 shadow-soft", className)}>
      <h2 className="font-semibold tracking-tight text-sm">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function ActionLink({ to, label, desc }: { to: string; label: string; desc: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col rounded-xl border border-border px-4 py-3 hover:bg-secondary/60 transition"
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </Link>
  );
}
