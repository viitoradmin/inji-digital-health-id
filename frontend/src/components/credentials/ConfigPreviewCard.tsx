import { ShieldCheck } from "lucide-react";
import type { CredentialConfiguration } from "@/types/credential-config";

export function ConfigPreviewCard({ config }: { config: CredentialConfiguration }) {
  const meta = config.metaDataDisplay?.[0];
  const name = meta?.name ?? config.credentialConfigKeyId ?? "Credential";
  const bg = meta?.background_color ?? "#12107c";
  const fg = meta?.text_color ?? "#FFFFFF";
  const format = (config.credentialFormat ?? "ldp_vc").toUpperCase();

  return (
    <div
      className="relative aspect-[1.6/1] rounded-2xl p-5 overflow-hidden shadow-elevated"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div className="absolute inset-0 opacity-20 credential-holo mix-blend-overlay" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">Verifiable Credential</p>
          <h3 className="mt-1 text-base font-semibold leading-tight">{name}</h3>
        </div>
        <div className="h-9 w-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
          <ShieldCheck className="h-4 w-4" />
        </div>
      </div>
      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider opacity-60">Issuer DID</p>
          <p className="text-xs font-mono truncate opacity-90">{config.didUrl ?? "—"}</p>
        </div>
        <span className="text-[10px] bg-white/15 backdrop-blur px-2 py-1 rounded-md border border-white/20 shrink-0">
          {format}
        </span>
      </div>
    </div>
  );
}
