import { createFileRoute, Link } from "@tanstack/react-router";
import { CredentialCard } from "@/components/CredentialCard";
import { CheckCircle2, Download, Eye, Share2, Home, ShieldCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/success")({
  head: () => ({ meta: [{ title: "Credential Issued — Inji Certify" }] }),
  component: SuccessPage,
});

function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-hero text-white relative overflow-hidden flex items-center justify-center px-4 py-12">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      {/* Floating confetti dots */}
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full animate-float"
          style={{
            left: `${(i * 137) % 100}%`,
            top: `${(i * 53) % 100}%`,
            background: ["#10B981", "#06B6D4", "#4F46E5", "#2563EB"][i % 4],
            animationDelay: `${(i % 6) * 0.4}s`,
            ["--r" as any]: `${i * 17}deg`,
          }}
        />
      ))}

      <div className="relative w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-success rounded-full blur-2xl opacity-50" />
            <div className="relative h-20 w-20 rounded-full bg-success text-success-foreground flex items-center justify-center animate-pulse-ring">
              <CheckCircle2 className="h-10 w-10" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Credential issued successfully
          </h1>
          <p className="mt-2 text-white/70">
            Your verifiable credential is now safely stored in your wallet.
          </p>
        </div>

        <div className="rounded-2xl glass-dark p-6 space-y-6">
          <div className="mx-auto max-w-sm">
            <CredentialCard
              floating
              name="Employee ID Credential"
              issuer="did:web:acme.org"
              type="JWT-VC"
              variant="indigo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Credential ID" value="vc:emp:0x8a2f…c401" />
            <Field label="Issuer DID" value="did:web:acme.org" />
            <Field label="Wallet" value="Inji Wallet · Mobile" icon={Wallet} />
            <Field label="Issued" value="May 15, 2026 · 14:32 UTC" />
          </div>

          <div className="flex items-center gap-2 text-xs text-white/70 pt-2 border-t border-white/10">
            <ShieldCheck className="h-4 w-4 text-success" />
            Signature verified · DID resolved · Schema valid
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Action icon={Eye}>View</Action>
            <Action icon={ShieldCheck}>Verify</Action>
            <Action icon={Download}>Receipt</Action>
            <Action icon={Share2}>Share</Action>
          </div>

          <Link
            to="/dashboard"
            className="w-full h-11 rounded-xl bg-white text-foreground text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-white/90 transition"
          >
            <Home className="h-4 w-4" /> Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-1 text-sm font-mono truncate flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-white/70" />}
        {value}
      </p>
    </div>
  );
}

function Action({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button className="h-10 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition text-xs font-medium inline-flex items-center justify-center gap-1.5">
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}
