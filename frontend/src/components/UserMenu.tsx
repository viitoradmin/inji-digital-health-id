import { LogOut, Mail, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { getUserInitials } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = getUserInitials(user.name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className={cn(
            "h-10 w-10 rounded-xl bg-gradient-brand text-primary-foreground",
            "flex items-center justify-center text-sm font-semibold shadow-elevated",
            "hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 rounded-2xl p-2">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
            <Avatar className="h-11 w-11 border border-border">
              <AvatarFallback className="bg-gradient-brand text-primary-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3 shrink-0" />
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-2" />
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
            <span>Issuer Administrator</span>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-1 pl-5">
            Signed in · demo session
          </p>
        </div>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            logout();
          }}
          className="rounded-xl text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
