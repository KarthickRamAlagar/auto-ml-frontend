import { CreditCard, Gauge, LogOut, MessageSquare, Settings, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { useMe } from "@/lib/me";
import { FeedbackDialog, SettingsDialog, UsageDialog } from "./Dialogs";
import { ResetCountdown } from "./UsageMeter";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { me, usage } = useMe();
  const [dlg, setDlg] = useState<null | "usage" | "settings" | "feedback">(null);
  if (!user) return null;
  const initial = user.email[0]?.toUpperCase() ?? "?";
  const used = usage ? usage.free_used + usage.paid_used : 0;
  const cap = usage ? usage.free_limit + usage.paid_limit : 25;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent" aria-label="Account menu">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-medium text-primary-foreground">{initial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.name || user.email.split("@")[0]}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {usage?.unlimited ? "Unlimited access" : `${used}/${cap} models this window`}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-72">
          <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
          {usage && !usage.unlimited && (
            <div className="space-y-1.5 px-2.5 pb-2">
              <Progress value={(used / cap) * 100} label="Model usage" />
              <p className="text-xs text-muted-foreground">
                <ResetCountdown />
              </p>
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDlg("usage")}>
            <Gauge /> Usage
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDlg("settings")}>
            <Settings /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/auto-ml/settings">
              <CreditCard /> Payments &amp; notifications
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDlg("feedback")}>
            <MessageSquare /> Give feedback
          </DropdownMenuItem>
          {me?.is_admin && (
            <DropdownMenuItem asChild>
              <Link to="/admin">
                <Shield /> Admin dashboard
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOut /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UsageDialog open={dlg === "usage"} onOpenChange={(o) => setDlg(o ? "usage" : null)} />
      <SettingsDialog open={dlg === "settings"} onOpenChange={(o) => setDlg(o ? "settings" : null)} />
      <FeedbackDialog open={dlg === "feedback"} onOpenChange={(o) => setDlg(o ? "feedback" : null)} />
    </>
  );
}
