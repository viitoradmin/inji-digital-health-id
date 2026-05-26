import { ShieldCheck, Sparkles } from "lucide-react";

interface Props {
  name: string;
  issuer: string;
  type: string;
  className?: string;
  variant?: "indigo" | "cyan" | "emerald" | "violet";
  floating?: boolean;
}

const variants = {
  indigo: "from-[oklch(0.45_0.2_270)] via-[oklch(0.5_0.22_264)] to-[oklch(0.55_0.18_220)]",
  cyan: "from-[oklch(0.55_0.15_220)] via-[oklch(0.6_0.16_200)] to-[oklch(0.65_0.14_180)]",
  emerald: "from-[oklch(0.4_0.12_200)] via-[oklch(0.55_0.14_180)] to-[oklch(0.65_0.16_160)]",
  violet: "from-[oklch(0.4_0.2_290)] via-[oklch(0.5_0.22_277)] to-[oklch(0.55_0.2_260)]",
};

export function CredentialCard({
  name,
  issuer,
  type,
  className = "",
  variant = "indigo",
  floating,
}: Props) {
  return (
    <div
      className={`relative aspect-[1.6/1] rounded-2xl p-5 text-white overflow-hidden bg-gradient-to-br ${variants[variant]} shadow-elevated ${floating ? "animate-float" : ""} ${className}`}
    >
      {/* Holographic shine */}
      <div className="absolute inset-0 credential-holo opacity-30 mix-blend-overlay" />
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute inset-0 shimmer opacity-60 pointer-events-none" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
            Verifiable Credential
          </p>
          <h3 className="mt-1 text-base font-semibold leading-tight">{name}</h3>
        </div>
        <div className="h-9 w-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
          <ShieldCheck className="h-4 w-4" />
        </div>
      </div>

      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-white/60">Issuer</p>
          <p className="text-xs font-mono text-white/90 truncate max-w-[160px]">{issuer}</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] bg-white/15 backdrop-blur px-2 py-1 rounded-md border border-white/20">
          <Sparkles className="h-3 w-3" />
          {type}
        </div>
      </div>
    </div>
  );
}
