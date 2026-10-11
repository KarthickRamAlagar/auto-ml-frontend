import { BellRing, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { api, ApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { Payment } from "@/lib/types";
import { cn, fmtInr } from "@/lib/utils";

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

/** One card per payment: locked while the admin decides, with a "Remind admin" button after the wait. */
export function PaymentStatusCard({ paymentId, initial, onDecided, compact }: { paymentId: string; initial?: Payment | null; onDecided?: (p: Payment) => void; compact?: boolean }) {
  const [pay, setPay] = useState<Payment | null>(initial ?? null);
  const [skew, setSkew] = useState(0); // server clock minus local clock
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const apply = (p: Payment) => {
    setSkew(p.now - Date.now() / 1000);
    setPay((old) => {
      if (old && old.status === "claimed" && (p.status === "approved" || p.status === "rejected")) {
        notify(p.status === "approved" ? "Payment approved" : "Payment could not be verified", `${fmtInr(p.amount)} · ${p.ref}`);
        onDecided?.(p);
      }
      return p;
    });
  };

  useEffect(() => {
    let alive = true;
    const load = () => api.get<Payment>(`/api/payments/${paymentId}`).then((p) => alive && apply(p)).catch(() => undefined);
    void load();
    const poll = setInterval(() => {
      if (alive && (!pay || pay.status === "claimed")) void load();
    }, 15000);
    const clock = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, pay?.status]);

  if (!pay) return null;
  void tick;
  const nowS = Date.now() / 1000 + skew;
  const since = pay.reminded_at ?? pay.claimed_at ?? pay.created_at;
  const left = Math.max(0, Math.ceil(since + pay.remind_after - nowS));
  const waiting = pay.status === "claimed";

  const remind = async () => {
    setBusy(true);
    setMsg(null);
    try {
      apply(await api.post<Payment>(`/api/payments/${pay.id}/remind`));
      setMsg("The admin has been emailed and flagged on their dashboard.");
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const tone = pay.status === "approved" ? "border-success/50 bg-success/5" : pay.status === "rejected" ? "border-destructive/50 bg-destructive/5" : "border-primary/40 bg-primary/5";
  return (
    <div className={cn("space-y-2 rounded-xl border p-4", tone)} aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        {waiting ? <Clock className="size-5 shrink-0 text-primary" /> : pay.status === "approved" ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : <XCircle className="size-5 shrink-0 text-destructive" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {waiting && `Payment of ${fmtInr(pay.amount)} is waiting for admin approval`}
            {pay.status === "approved" && `Payment of ${fmtInr(pay.amount)} approved`}
            {pay.status === "rejected" && `Payment of ${fmtInr(pay.amount)} could not be verified`}
            {pay.status === "created" && `Payment of ${fmtInr(pay.amount)} not confirmed yet`}
          </p>
          <p className="text-xs text-muted-foreground">
            Reference <span className="font-mono">{pay.ref}</span>
            {waiting && " · this card updates by itself, nothing else to do"}
          </p>
        </div>
        {waiting && (left > 0 ? <span className="text-xs tabular-nums text-muted-foreground">Remind in {mmss(left)}</span> : (
          <Button size="sm" variant="outline" onClick={remind} disabled={busy}>
            {busy ? <Spinner /> : <BellRing />} Remind admin
          </Button>
        ))}
      </div>
      {!compact && waiting && (pay.reminders ?? 0) > 0 && <p className="text-xs text-muted-foreground">Reminder sent {pay.reminders}×. You can nudge again after another {mmss(pay.remind_after)}.</p>}
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
