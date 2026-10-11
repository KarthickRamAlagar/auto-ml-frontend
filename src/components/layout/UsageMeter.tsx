import { Infinity as InfinityIcon, Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { fmtClock, fmtDuration } from "@/lib/utils";
import { useMe } from "@/lib/me";

export function ResetCountdown({ className }: { className?: string }) {
  const { usage, now } = useMe();
  if (!usage) return null;
  if (usage.unlimited) return <span className={className}>Unlimited access</span>;
  if (!usage.resets_at) return <span className={className}>Your window starts when you run your first model.</span>;
  const left = usage.resets_at - now;
  if (left <= 0) return <span className={className}>Limit is resetting…</span>;
  return (
    <span className={className}>
      Resets in <b className="tabular-nums">{fmtDuration(left)}</b> · {fmtClock(usage.resets_at)}
    </span>
  );
}

export function UsageMeter() {
  const { usage } = useMe();
  if (!usage) return <p className="text-sm text-muted-foreground">Loading usage…</p>;
  const bonus = usage.verified_spend > 100 ? 6 : usage.verified_spend > 50 ? 3 : 0;
  if (usage.unlimited)
    return (
      <div className="flex items-center gap-2 text-sm">
        <InfinityIcon className="size-4 text-primary" />
        <span>Your account has free, unlimited access.</span>
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span>Free models</span>
          <span className="tabular-nums text-muted-foreground">
            {usage.free_used} / {usage.free_limit} used
          </span>
        </div>
        <Progress value={(usage.free_used / usage.free_limit) * 100} label="Free models used" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span>Paid models (₹2 each)</span>
          <span className="tabular-nums text-muted-foreground">
            {usage.paid_used} / {usage.paid_limit} used
          </span>
        </div>
        <Progress value={(usage.paid_used / usage.paid_limit) * 100} label="Paid models used" barClassName="bg-[var(--series-1)]" />
      </div>
      <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-[13px]">
        <Timer className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <ResetCountdown />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Window: {fmtDuration(usage.window_seconds)}
        </span>
        {bonus > 0 && <Badge variant="success">{bonus}% faster reset (loyalty)</Badge>}
        <Badge variant="muted">{Math.max(0, 2 - usage.reports_used)} free report(s) left</Badge>
      </div>
      {usage.paid_blocked && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          Paid features are locked because a payment could not be verified. Contact the admin to resolve it.
        </p>
      )}
    </div>
  );
}
