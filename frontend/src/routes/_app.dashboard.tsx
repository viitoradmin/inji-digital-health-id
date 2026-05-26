import { createFileRoute, Link } from "@tanstack/react-router";
import { CredentialCard } from "@/components/CredentialCard";
import {
  TrendingUp,
  ShieldCheck,
  Wallet,
  Activity,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Clock,
  FileCheck2,
} from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Inji Certify" }] }),
  component: Dashboard,
});

const stats = [
  {
    label: "Credentials Issued",
    value: "24,891",
    delta: "+12.4%",
    icon: FileCheck2,
    tone: "primary",
  },
  { label: "Active Configurations", value: "18", delta: "+2", icon: Activity, tone: "accent" },
  { label: "Wallet Connections", value: "9,210", delta: "+8.1%", icon: Wallet, tone: "trust" },
  {
    label: "Verification Success",
    value: "99.4%",
    delta: "+0.3%",
    icon: ShieldCheck,
    tone: "success",
  },
];

const credentials = [
  {
    name: "Employee ID Credential",
    type: "JWT-VC",
    issuer: "did:web:acme.org",
    claims: 8,
    status: "Active",
    variant: "indigo" as const,
  },
  {
    name: "University Degree",
    type: "LDP-VC",
    issuer: "did:web:univ.edu",
    claims: 12,
    status: "Active",
    variant: "violet" as const,
  },
  {
    name: "KYC Credential",
    type: "SD-JWT",
    issuer: "did:web:kyc.gov",
    claims: 6,
    status: "Active",
    variant: "cyan" as const,
  },
  {
    name: "Health Pass",
    type: "JWT-VC",
    issuer: "did:web:health.gov",
    claims: 5,
    status: "Beta",
    variant: "emerald" as const,
  },
  {
    name: "Membership Card",
    type: "LDP-VC",
    issuer: "did:web:club.org",
    claims: 4,
    status: "Active",
    variant: "indigo" as const,
  },
  {
    name: "Driving License",
    type: "mDL",
    issuer: "did:web:rto.gov",
    claims: 9,
    status: "Active",
    variant: "cyan" as const,
  },
];

function Dashboard() {
  return (
    <div className="px-4 lg:px-8 py-8 space-y-8 w-full">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero text-white p-8 lg:p-10">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Welcome back, Aria</p>
          <h1 className="mt-2 text-3xl lg:text-4xl font-semibold tracking-tight">
            Ready to issue trusted credentials.
          </h1>
          <p className="mt-3 text-white/70 max-w-lg">
            Your issuer is verified and operational. Six credential configurations are live across
            three networks.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/issuance"
              search={{ recordId: undefined, credentialConfigId: undefined }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-foreground text-sm font-medium hover:bg-white/90 transition"
            >
              <Plus className="h-4 w-4" /> Issue credential
            </Link>
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl glass-dark text-white text-sm font-medium hover:bg-white/10 transition"
            >
              <ShieldCheck className="h-4 w-4" /> Verify a credential
            </Link>
          </div>
        </div>

        {/* Mini credential preview */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-72 rotate-6">
          <CredentialCard
            floating
            variant="indigo"
            name="Employee ID Credential"
            issuer="did:web:acme.org"
            type="JWT-VC"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-elevated transition"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                <TrendingUp className="h-3 w-3" /> {s.delta}
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Credentials grid */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Credential Configurations</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Supported credential types from your issuer profile.
            </p>
          </div>
          <Link
            to="/credentials"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {credentials.map((c) => (
            <div
              key={c.name}
              className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-elevated transition group"
            >
              <div className="p-4 pb-0">
                <CredentialCard name={c.name} issuer={c.issuer} type={c.type} variant={c.variant} />
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{c.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                      {c.issuer}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-md font-medium ${
                      c.status === "Active"
                        ? "bg-success/15 text-success"
                        : "bg-accent/15 text-accent"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <Meta label="Claims" value={c.claims.toString()} />
                  <Meta label="Format" value={c.type} />
                  <Meta label="v" value="1.0" />
                </div>

                <div className="flex gap-2">
                  <Link
                    to="/credentials/$id"
                    params={{ id: "FarmerCredential" }}
                    className="flex-1 h-9 rounded-lg bg-gradient-brand text-primary-foreground text-xs font-medium inline-flex items-center justify-center gap-1 shadow-soft hover:shadow-elevated transition"
                  >
                    Configure
                  </Link>
                  <button className="h-9 px-3 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition">
                    Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-lg font-semibold tracking-tight">Recent Issuance Activity</h2>
        <div className="mt-4 divide-y divide-border">
          {[
            {
              name: "Employee ID #2451",
              time: "2 min ago",
              status: "Issued",
              icon: CheckCircle2,
              tone: "success",
            },
            {
              name: "University Degree #998",
              time: "12 min ago",
              status: "Wallet pending",
              icon: Clock,
              tone: "accent",
            },
            {
              name: "Health Pass #5610",
              time: "44 min ago",
              status: "Issued",
              icon: CheckCircle2,
              tone: "success",
            },
            {
              name: "KYC Credential #112",
              time: "1 hr ago",
              status: "Issued",
              icon: CheckCircle2,
              tone: "success",
            },
          ].map((row) => (
            <div key={row.name} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    row.tone === "success"
                      ? "bg-success/15 text-success"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  <row.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.time}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{row.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-mono font-medium mt-0.5">{value}</p>
    </div>
  );
}
