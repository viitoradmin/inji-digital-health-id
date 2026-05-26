import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, CreditCard, Send, ShieldCheck, Server } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DUMMY_NOTIFICATIONS,
  getReadIds,
  markAllRead,
  markRead,
  type NotificationItem,
  type NotificationType,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

const typeMeta: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  issuance: { icon: Send, className: "bg-primary/10 text-primary" },
  verification: { icon: ShieldCheck, className: "bg-success/10 text-success" },
  config: { icon: CreditCard, className: "bg-accent/20 text-accent-foreground" },
  system: { icon: Server, className: "bg-secondary text-muted-foreground" },
};

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  const unreadCount = useMemo(
    () => DUMMY_NOTIFICATIONS.filter((n) => !readIds.has(n.id)).length,
    [readIds],
  );

  const handleMarkAll = () => {
    const ids = DUMMY_NOTIFICATIONS.map((n) => n.id);
    markAllRead(ids);
    setReadIds(new Set(ids));
  };

  const handleOpenItem = (item: NotificationItem) => {
    setReadIds((prev) => markRead(item.id, prev));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          className="h-10 w-10 rounded-xl border border-border bg-card hover:bg-secondary transition flex items-center justify-center relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 rounded-2xl border-border shadow-elevated"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 shrink-0"
              onClick={handleMarkAll}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[min(420px,70vh)]">
          <ul className="p-2">
            {DUMMY_NOTIFICATIONS.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                read={readIds.has(item.id)}
                onActivate={() => handleOpenItem(item)}
              />
            ))}
          </ul>
        </ScrollArea>
        <div className="px-4 py-2.5 border-t border-border bg-secondary/40">
          <p className="text-[10px] text-muted-foreground text-center">
            Demo alerts for issuance, verification, and config activity
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  item,
  read,
  onActivate,
}: {
  item: NotificationItem;
  read: boolean;
  onActivate: () => void;
}) {
  const meta = typeMeta[item.type];
  const Icon = meta.icon;

  const content = (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-xl transition text-left w-full",
        read ? "opacity-70 hover:bg-secondary/60" : "bg-secondary/40 hover:bg-secondary",
      )}
    >
      <div
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          meta.className,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-snug", !read && "font-medium")}>{item.title}</p>
          {!read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>
        <p className="text-[10px] text-muted-foreground mt-1.5">{formatTime(item.createdAt)}</p>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <li>
        <Link to={item.href} onClick={onActivate} className="block">
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button type="button" className="block w-full" onClick={onActivate}>
        {content}
      </button>
    </li>
  );
}
