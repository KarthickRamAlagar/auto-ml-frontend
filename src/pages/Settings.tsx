import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PaymentStatusCard } from "@/components/pay/PaymentStatusCard";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Pager, usePaged } from "@/components/ui/pager";
import { Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { chatPath } from "@/lib/ids";
import { askNotifyPermission, notifyState } from "@/lib/notify";
import { useSeo } from "@/lib/seo";
import type { PaymentRow } from "@/lib/types";
import { fmtInr } from "@/lib/utils";

const when = (ts?: number | null) => (ts ? new Date(ts * 1000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "–");

interface Note {
  key: string;
  at: number;
  title: string;
  sub: string;
  tone: "info" | "good" | "bad";
}

const notesFrom = (rows: PaymentRow[]): Note[] => {
  const out: Note[] = [];
  for (const p of rows) {
    const who = `${fmtInr(p.amount)} · ${p.ref}${p.chat ? ` · ${p.chat.title}` : ""}`;
    if (p.claimed_at) out.push({ key: `${p.id}c`, at: p.claimed_at, title: "Payment sent for approval", sub: who, tone: "info" });
    if (p.reminded_at) out.push({ key: `${p.id}r`, at: p.reminded_at, title: `Reminder sent to the admin${(p.reminders ?? 1) > 1 ? ` (${p.reminders}×)` : ""}`, sub: who, tone: "info" });
    if (p.status === "approved" && p.decided_at) out.push({ key: `${p.id}a`, at: p.decided_at, title: "Payment approved", sub: who, tone: "good" });
    if (p.status === "rejected" && p.decided_at) out.push({ key: `${p.id}x`, at: p.decided_at, title: "Payment could not be verified", sub: who, tone: "bad" });
  }
  return out.sort((a, b) => b.at - a.at);
};

export default function Settings() {
  useSeo({ title: "Settings · Auto ML", noindex: true });
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [perm, setPerm] = useState(notifyState());

  useEffect(() => {
    let alive = true;
    api
      .get<{ payments: PaymentRow[] }>("/api/payments/mine?page=1&per_page=50")
      .then((d) => alive && setRows(d.payments))
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const payPg = usePaged(rows ?? [], 7);
  const notePg = usePaged(useMemo(() => notesFrom(rows ?? []), [rows]), 7);

  return (
    <AppShell title="Settings">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
          <section className="space-y-2 rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 font-serif text-lg">
              <Bell className="size-4" /> Browser notifications
            </h2>
            <p className="text-sm text-muted-foreground">Get a browser notification when a run finishes or a payment is decided, even if this tab is in the background.</p>
            {perm === "granted" && <p className="text-sm text-success">Enabled in this browser.</p>}
            {perm === "denied" && <p className="text-sm text-muted-foreground">Blocked. Allow notifications for this site in your browser's site settings to turn them on.</p>}
            {perm === "unsupported" && <p className="text-sm text-muted-foreground">This browser does not support notifications.</p>}
            {perm === "default" && (
              <Button size="sm" onClick={async () => setPerm(await askNotifyPermission())}>
                Allow notifications
              </Button>
            )}
          </section>

          {err && <p className="text-sm text-destructive">{err}</p>}
          {!rows && !err && <Spinner />}

          {rows && (
            <>
              <section className="space-y-3">
                <h2 className="font-serif text-lg">Notifications</h2>
                {notePg.total === 0 && <p className="text-sm text-muted-foreground">Nothing yet. Updates about your payments appear here.</p>}
                <ul className="space-y-2">
                  {notePg.slice.map((n) => (
                    <li key={n.key} className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.tone === "good" ? "bg-success" : n.tone === "bad" ? "bg-destructive" : "bg-primary"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{n.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{n.sub}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{when(n.at)}</span>
                    </li>
                  ))}
                </ul>
                <Pager {...notePg} always />
              </section>

              <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-serif text-lg">Payments</h2>
                  <span className="text-xs text-muted-foreground">{payPg.total} total</span>
                </div>
                {payPg.total === 0 && <p className="text-sm text-muted-foreground">No payments yet. They appear here, one card per chat, once you pay for a run or a report.</p>}
                {payPg.slice.map((p) => (
                  <div key={p.id} className="space-y-2 rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {p.chat ? (
                          <Link to={chatPath(p.chat.id)} className="text-primary hover:underline">
                            {p.chat.title}
                          </Link>
                        ) : (
                          "Chat no longer saved"
                        )}
                      </p>
                      <span className="text-xs text-muted-foreground">{when(p.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.kind === "report" ? "Report download" : `${p.context?.models?.length ?? 0} model(s)`} · {p.context?.domain ?? ""} {p.context?.task ?? ""} · {fmtInr(p.amount)}
                      {p.decided_at ? ` · decided ${when(p.decided_at)}` : ""}
                    </p>
                    <PaymentStatusCard paymentId={p.id} initial={p} compact />
                  </div>
                ))}
                <Pager {...payPg} always />
              </section>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
