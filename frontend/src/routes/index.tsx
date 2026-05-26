import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthUser } from "@/lib/auth-session";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { CertifyLogoMark } from "@/components/CertifyLogoMark";
import { CredentialCard } from "@/components/CredentialCard";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (getAuthUser()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in — Inji Certify" },
      {
        name: "description",
        content: "Sign in to issue and manage Verifiable Credentials with OpenID4VCI.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* ── Left: hero panel ── */}
      <div className="relative hidden lg:flex bg-gradient-hero text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <CertifyLogoMark
          size={320}
          className="absolute -right-16 top-1/3 opacity-[0.08] pointer-events-none"
        />

        <div className="relative z-10 flex flex-col p-10 w-full">
          <Logo variant="light" size="lg" linkTo={false} />

          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-dark text-xs text-white/80 w-fit">
              <Sparkles className="h-3 w-3" /> OpenID4VCI · Pre-Authorized Code Flow
            </div>
            <h1 className="mt-5 text-4xl xl:text-5xl font-semibold leading-[1.05] tracking-tight">
              Issue & manage <br />
              <span className="bg-gradient-to-r from-white via-cyan-200 to-indigo-200 bg-clip-text text-transparent">
                Verifiable Credentials
              </span>{" "}
              securely.
            </h1>
            <p className="mt-4 text-white/70 text-base leading-relaxed">
              The trusted issuance portal for governments, universities and enterprises.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-sm">
              {[
                { k: "DID", v: "did:web" },
                { k: "Format", v: "JWT-VC" },
                { k: "Standard", v: "OID4VCI" },
              ].map((b) => (
                <div key={b.k} className="glass-dark rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/50">{b.k}</p>
                  <p className="text-sm font-mono mt-1">{b.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating credential cards */}
          <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-[360px] hidden xl:block">
            <div style={{ transform: "rotate(-8deg)" }}>
              <CredentialCard
                floating
                variant="indigo"
                name="Health ID Credential"
                issuer="did:web:acme.org"
                type="JWT-VC"
              />
            </div>
            <div
              className="mt-6 ml-12"
              style={{ transform: "rotate(6deg)", animationDelay: "1.5s" }}
            >
              <CredentialCard
                floating
                variant="cyan"
                name="Hospital ID"
                issuer="did:web:univ.edu"
                type="LDP-VC"
              />
            </div>
            <div
              className="mt-6 -ml-6"
              style={{ transform: "rotate(-3deg)", animationDelay: "3s" }}
            >
              <CredentialCard
                floating
                variant="emerald"
                name="Health Pass"
                issuer="did:web:health.gov"
                type="SD-JWT"
              />
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck className="h-3.5 w-3.5" />
            Protected with OpenID4VCI &amp; DID standards
          </div>
        </div>
      </div>

      {/* ── Right: auth panel ── */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Branding */}
          <div className="flex flex-col items-center text-center mb-8">
            <CertifyLogoMark size={48} className="drop-shadow-md mb-3" />
            <p className="text-xl font-semibold tracking-tight">Digital Health Credential</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
              Issuance Portal
            </p>
          </div>

          {/* Auth card */}
          <div className="rounded-2xl border border-border bg-card shadow-soft p-6">
            <AuthForm />
          </div>
        </div>
      </div>
    </div>
  );
}
