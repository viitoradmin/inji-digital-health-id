import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CreditCard,
  ClipboardList,
  Send,
  ScanLine,
  BarChart3,
  Settings,
  Search,
} from "lucide-react";
import { Logo } from "./Logo";
import { CertifyLogoMark } from "./CertifyLogoMark";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/credentials", label: "Credentials", icon: CreditCard },
  { to: "/records", label: "Records", icon: ClipboardList },
  { to: "/issuance", label: "Issuance Requests", icon: Send },
  { to: "/verify", label: "Verification", icon: ScanLine },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-deep text-white/90 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-white/10">
          <Logo variant="light" size="lg" linkTo="/dashboard" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-white/10 text-white shadow-inner"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-ring" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2">
            <CertifyLogoMark size={28} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/90 truncate">Digital Health Credential</p>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/45">
                Issuance Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70 pt-2 border-t border-white/10">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
            <span className="truncate">Issuer DID active</span>
          </div>
          <p className="text-[11px] font-mono text-white/50 truncate">did:web:digitalhealth.gov.in</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="h-16 px-4 lg:px-8 flex items-center gap-4">
            <div className="lg:hidden shrink-0">
              <Logo linkTo="/dashboard" />
            </div>
            <div className="ml-auto flex items-center gap-3 min-w-0">
              <div className="relative hidden md:block w-64 lg:w-80 xl:w-96 shrink min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  placeholder="Search credentials, schemas, DIDs…"
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition"
                />
              </div>
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
