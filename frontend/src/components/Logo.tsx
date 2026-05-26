import { Link } from "@tanstack/react-router";
import { CertifyLogoMark } from "@/components/CertifyLogoMark";
import { cn } from "@/lib/utils";

export type LogoProps = {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  compact?: boolean;
  linkTo?: string | false;
  className?: string;
};

const sizes = { sm: 32, md: 36, lg: 44 } as const;

export function Logo({
  variant = "dark",
  size = "md",
  compact = false,
  linkTo = "/",
  className,
}: LogoProps) {
  const markSize = sizes[size];
  const isLight = variant === "light";

  const content = (
    <>
      <CertifyLogoMark size={markSize} className="drop-shadow-sm" />
      <div className="flex flex-col leading-none min-w-0">
        <span
          className={cn(
            "font-semibold tracking-tight truncate",
            size === "lg" ? "text-lg" : "text-base",
            isLight ? "text-white" : "text-foreground",
          )}
        >
          Digital Health Credential
        </span>
        {!compact && (
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.2em] mt-0.5 truncate",
              isLight ? "text-white/60" : "text-muted-foreground",
            )}
          >
            Issuance Portal
          </span>
        )}
      </div>
    </>
  );

  const rootClass = cn("flex items-center gap-2.5 group min-w-0", className);

  if (linkTo === false) {
    return <div className={rootClass}>{content}</div>;
  }

  return (
    <Link to={linkTo} className={cn(rootClass, "hover:opacity-95 transition-opacity")}>
      {content}
    </Link>
  );
}

/** Centered branding for login / register panel */
export function LogoBrandPanel({
  variant = "dark",
  className,
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center gap-3", className)}>
      <CertifyLogoMark size={52} className="drop-shadow-md" />
      <div>
        <p
          className={cn(
            "text-xl font-semibold tracking-tight",
            variant === "light" ? "text-white" : "text-foreground",
          )}
        >
          Digital Health Credential
        </p>
        <p
          className={cn(
            "text-[11px] uppercase tracking-[0.22em] mt-1",
            variant === "light" ? "text-white/60" : "text-muted-foreground",
          )}
        >
          Issuance Portal Backed by MOSIP's Inji Ecosystem
        </p>
      </div>
    </div>
  );
}
