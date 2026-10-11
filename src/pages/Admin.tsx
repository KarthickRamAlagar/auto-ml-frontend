import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { askNotifyPermission, notify } from "@/lib/notify";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { BarList, ChartCard, Columns } from "@/components/chat/charts";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pager, usePaged } from "@/components/ui/pager";
import { Spinner } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me";
import { useSeo } from "@/lib/seo";
import { cn, fmtInr } from "@/lib/utils";

interface Summary {
  totals: { users: number; paying_users: number; revenue: number; pending_amount: number; pending_count: number; runs: number; models_trained: number; avg_rating: number | null };
  revenue_by_day: { date: string; amount: number }[];
  runs_by_day: { date: string; count: number }[];
  signups_by_day: { date: string; count: number }[];
  domains: { name: string; count: number }[];
  models: { id: string; name: string; count: number }[];
}
interface AdminPayment {
  id: string;
  ref: string;
  user_email: string;
  kind: string;
  amount: number;
  status: "created" | "claimed" | "approved" | "rejected";
  created_at: number;
  claimed_at: number | null;
  project_id?: string;
  context?: { domain?: string; models?: string[] };
}
interface AdminUser {
  email: string;
  created_at: number;
  verified_spend: number;
  free_used: number;
  paid_used: number;
  reports_used: number;
  paid_blocked: boolean;
}
interface FeedbackItem {
  rating: number;
  text: string;
  email?: string;
  user_email?: string;
  created_at?: number;
  ts?: number;
}

interface LlmInfo {
  providers: { provider: string; configured: boolean; keys: number; model: string | null; runner_up: string | null }[];
  explicit_groups: boolean;
  integrations: { kaggle: boolean; youtube: boolean; email: boolean; firestore: boolean; auth: string };
}

const STATUS_VARIANT = { claimed: "warning", created: "muted", approved: "success", rejected: "destructive" } as const;
const day = (d: string) => d.slice(5);

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-serif text-2xl tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

interface LlmProbe {
  ok: boolean;
  message: string;
  results: { provider: string; key: number; model: string; ok: boolean; error: string | null; ms: number }[];
}

export default function Admin() {
  useSeo({ title: "Admin · Auto ML", noindex: true });
  const { me } = useMe();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") ?? "overview";
  const focus = sp.get("payment");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vip, setVip] = useState<{ emails: string[]; admins: string[] }>({ emails: [], admins: [] });
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [newVip, setNewVip] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [llm, setLlm] = useState<LlmInfo | null>(null);
  const [llmTest, setLlmTest] = useState<string | null>(null);
  const [llmRows, setLlmRows] = useState<LlmProbe["results"]>([]);
  const [testing, setTesting] = useState(false);
  const [ytTest, setYtTest] = useState<string | null>(null);
  const [ytBusy, setYtBusy] = useState(false);
  const payPg = usePaged(payments, 8);
  const [alerts, setAlerts] = useState<{ items: { id: string; ref: string; user_email?: string; amount: number; waiting_seconds: number; reminders: number }[]; count: number; reminders: number } | null>(null);
  const alertPg = usePaged(alerts?.items ?? [], 5);
  const userPg = usePaged(users, 10);
  const fbPg = usePaged(feedback, 8);

  const load = useCallback(async () => {
    try {
      const [s, p, u, v, f] = await Promise.all([
        api.get<Summary>("/api/admin/summary"),
        api.get<{ payments: AdminPayment[] }>("/api/admin/payments"),
        api.get<{ users: AdminUser[] }>("/api/admin/users"),
        api.get<{ emails: string[]; admins: string[] }>("/api/admin/vip"),
        api.get<{ feedback: FeedbackItem[] }>("/api/admin/feedback"),
      ]);
      setSummary(s);
      setPayments(p.payments);
      setUsers(u.users);
      setVip(v);
      setFeedback(f.feedback);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (me?.is_admin) void load();
  }, [me?.is_admin, load]);
  const lastSeen = useRef({ count: 0, reminders: 0 });
  useEffect(() => {
    if (!me?.is_admin) return;
    let alive = true;
    const poll = () =>
      api
        .get<NonNullable<typeof alerts>>("/api/admin/notifications")
        .then((a) => {
          if (!alive) return;
          setAlerts(a);
          const prev = lastSeen.current;
          if (a.reminders > prev.reminders) notify("Payment reminder", `${a.reminders} user(s) are waiting for approval.`, undefined, true);
          else if (a.count > prev.count) notify("New payment to review", `${a.count} payment(s) waiting.`, undefined, true);
          if (a.count !== prev.count || a.reminders !== prev.reminders) void load();
          lastSeen.current = { count: a.count, reminders: a.reminders };
        })
        .catch(() => undefined);
    void askNotifyPermission();
    void poll();
    const t = setInterval(poll, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [me?.is_admin, load]);
  useEffect(() => {
    if (me?.is_admin && tab === "ai" && !llm) api.get<LlmInfo>("/api/admin/llm").then(setLlm).catch((e: Error) => setErr(e.message));
  }, [me?.is_admin, tab, llm]);

  useEffect(() => {
    const i = payments.findIndex((x) => x.id === focus);
    if (i >= 0) payPg.setPage(Math.floor(i / 8));
  }, [focus, payments]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (focus && payments.length) document.getElementById(`pay-${focus}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus, payments.length, tab]);

  if (!me) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;
  if (!me.is_admin) return <Navigate to="/auto-ml" replace />;

  const decide = async (id: string, decision: "approve" | "reject") => {
    setBusy(id);
    try {
      await api.post(`/api/admin/payments/${id}/decision`, { decision });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const t = summary?.totals;
  const when = (ts?: number | null) => (ts ? new Date(ts * 1000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "–");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
        <Logo size="sm" />
        <span className="text-sm text-muted-foreground">Admin</span>
        <Button variant="ghost" size="sm" className="ml-auto" asChild>
          <Link to="/auto-ml">Back to app</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        {alerts && alerts.count > 0 && (
          <div className={`rounded-xl border p-3 text-sm ${alerts.reminders ? "border-destructive/50 bg-destructive/5" : "border-primary/40 bg-primary/5"}`} role="status">
            <p className="font-medium">
              {alerts.count} payment(s) waiting{alerts.reminders ? `, ${alerts.reminders} with a reminder from the user` : ""}
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {alertPg.slice.map((i) => (
                <li key={i.id}>
                  <button className="text-primary hover:underline" onClick={() => setSp({ tab: "payments", payment: i.id })}>
                    {i.ref}
                  </button>{" "}
                  · {i.user_email ?? "user"} · {fmtInr(i.amount)} · waiting {Math.max(1, Math.round(i.waiting_seconds / 60))} min{i.reminders ? ` · reminded ${i.reminders}×` : ""}
                </li>
              ))}
            </ul>
            <Pager {...alertPg} always />
          </div>
        )}
        <Tabs value={tab} onValueChange={(v) => setSp({ tab: v })}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">
              Payments {t && t.pending_count > 0 && <Badge variant="warning">{t.pending_count}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="access">Free access</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="ai">AI &amp; integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {!summary || !t ? (
              <Spinner />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Stat label="Revenue (approved)" value={fmtInr(t.revenue)} sub={`${fmtInr(t.pending_amount)} pending`} />
                  <Stat label="Users" value={String(t.users)} sub={`${t.paying_users} paying`} />
                  <Stat label="Runs" value={String(t.runs)} sub={`${t.models_trained} models trained`} />
                  <Stat label="Avg rating" value={t.avg_rating != null ? `${t.avg_rating} / 5` : "–"} sub={`${feedback.length} reviews`} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ChartCard title="Revenue per day" subtitle="Approved payments, last 14 days (₹)" rows={summary.revenue_by_day.map((d) => ({ label: d.date, value: d.amount }))} valueLabel="₹">
                    <Columns data={summary.revenue_by_day.map((d) => ({ label: day(d.date), value: d.amount }))} xInterval={1} />
                  </ChartCard>
                  <ChartCard title="Runs per day" rows={summary.runs_by_day.map((d) => ({ label: d.date, value: d.count }))} valueLabel="Runs">
                    <Columns data={summary.runs_by_day.map((d) => ({ label: day(d.date), value: d.count }))} color="var(--series-2)" xInterval={1} />
                  </ChartCard>
                  <ChartCard title="Sign-ups per day" rows={summary.signups_by_day.map((d) => ({ label: d.date, value: d.count }))} valueLabel="Users">
                    <Columns data={summary.signups_by_day.map((d) => ({ label: day(d.date), value: d.count }))} color="var(--series-3)" xInterval={1} />
                  </ChartCard>
                  <ChartCard title="Popular domains" rows={summary.domains.map((d) => ({ label: d.name, value: d.count }))} valueLabel="Runs">
                    <BarList data={summary.domains.map((d) => ({ label: d.name, value: d.count }))} color="var(--series-4)" format={(v) => String(v)} />
                  </ChartCard>
                  <ChartCard title="Popular models" className="md:col-span-2" rows={summary.models.map((d) => ({ label: d.name, value: d.count }))} valueLabel="Times run">
                    <BarList data={summary.models.map((d) => ({ label: d.name, value: d.count }))} format={(v) => String(v)} />
                  </ChartCard>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-2">
            {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
            {payPg.slice.map((p) => (
              <div id={`pay-${p.id}`} key={p.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3", focus === p.id && "ring-2 ring-primary")}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {fmtInr(p.amount)} <span className="font-mono text-xs">{p.ref}</span>
                    <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                    <Badge variant="outline">{p.kind}</Badge>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.user_email} · {when(p.claimed_at ?? p.created_at)}
                    {p.context?.domain ? ` · ${p.context.domain}` : ""}
                    {p.context?.models ? ` · ${p.context.models.length} model(s)` : ""}
                  </p>
                </div>
                {(p.status === "claimed" || p.status === "created") && (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy === p.id} onClick={() => decide(p.id, "approve")}>
                      <Check /> Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => decide(p.id, "reject")}>
                      <X /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <Pager {...payPg} always />
          </TabsContent>

          <TabsContent value="users">
            <div className="scroll-thin overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    {["Email", "Joined", "Verified spend", "Free", "Paid", "Reports", ""].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {userPg.slice.map((u) => (
                    <tr key={u.email} className="border-t">
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{when(u.created_at)}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtInr(u.verified_spend ?? 0)}</td>
                      <td className="px-3 py-2 tabular-nums">{u.free_used}</td>
                      <td className="px-3 py-2 tabular-nums">{u.paid_used}</td>
                      <td className="px-3 py-2 tabular-nums">{u.reports_used}</td>
                      <td className="px-3 py-2">{u.paid_blocked && <Badge variant="destructive">paid blocked</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager {...userPg} always />
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <form
              className="flex max-w-md gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const r = await api.post<{ emails: string[] }>("/api/admin/vip", { email: newVip });
                  setVip((v) => ({ ...v, emails: r.emails }));
                  setNewVip("");
                  setErr(null);
                } catch (e2) {
                  setErr((e2 as Error).message);
                }
              }}
            >
              <Input type="email" value={newVip} onChange={(e) => setNewVip(e.target.value)} placeholder="friend@example.com" aria-label="Email to give free access" />
              <Button type="submit">Add</Button>
            </form>
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-2 text-sm font-medium">Unlimited free access</p>
              <ul className="divide-y text-sm">
                {vip.admins.map((a) => (
                  <li key={a} className="flex items-center justify-between py-2">
                    {a} <Badge>admin</Badge>
                  </li>
                ))}
                {vip.emails.map((e) => (
                  <li key={e} className="flex items-center justify-between py-2">
                    {e}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const r = await api.del<{ emails: string[] }>(`/api/admin/vip?email=${encodeURIComponent(e)}`);
                        setVip((v) => ({ ...v, emails: r.emails }));
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Admin emails come from the server's ADMIN_EMAILS setting.</p>
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-2">
            {feedback.length === 0 && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
            {fbPg.slice.map((f, i) => (
              <div key={i} className="rounded-xl border bg-card p-3 text-sm">
                <p className="font-medium">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</p>
                {f.text && <p className="mt-1">{f.text}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{f.email ?? f.user_email} · {when(f.created_at ?? f.ts)}</p>
              </div>
            ))}
            <Pager {...fbPg} always />
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            {!llm ? (
              <Spinner />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {llm.providers.map((p) => (
                    <div key={p.provider} className="rounded-xl border bg-card p-4 text-sm">
                      <p className="flex items-center justify-between font-medium">
                        <span className="capitalize">{p.provider}</span>
                        <Badge variant={p.configured ? "success" : "muted"}>{p.configured ? `${p.keys} key${p.keys > 1 ? "s" : ""}` : "no key"}</Badge>
                      </p>
                      {p.configured ? (
                        <>
                          <p className="mt-2 text-xs text-muted-foreground">Selected (most capable available)</p>
                          <p className="font-mono text-xs">{p.model ?? "provider default"}</p>
                          {p.runner_up && <p className="mt-1 text-xs text-muted-foreground">Backup: <span className="font-mono">{p.runner_up}</span></p>}
                        </>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">Set this provider's API key on the server to enable it.</p>
                      )}
                    </div>
                  ))}
                </div>
                {llm.explicit_groups && <p className="text-xs text-muted-foreground">LLM_GROUPS is set, so it overrides the providers above.</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    disabled={testing}
                    onClick={async () => {
                      setTesting(true);
                      setLlmTest(null);
                      setLlmRows([]);
                      try {
                        const r = await api.post<LlmProbe>("/api/admin/llm/test");
                        setLlmTest(r.message);
                        setLlmRows(r.results);
                      } catch (e) {
                        setLlmTest((e as Error).message);
                      } finally {
                        setTesting(false);
                      }
                    }}
                  >
                    {testing && <Spinner />} Test the AI connection
                  </Button>
                  {llmTest && <p className="text-sm text-muted-foreground">{llmTest}</p>}
                </div>
                {llmRows.length > 0 && (
                  <ul className="divide-y rounded-xl border bg-card text-sm">
                    {llmRows.map((r, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                        <Badge variant={r.ok ? "success" : "muted"}>{r.ok ? "works" : "failed"}</Badge>
                        <span className="font-medium capitalize">
                          {r.provider} · key {r.key}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{r.model}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{r.ok ? `${r.ms} ms` : r.error}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="rounded-xl border bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Integrations</p>
                  <ul className="divide-y text-sm">
                    {[
                      ["Kaggle dataset search", llm.integrations.kaggle, "KAGGLE_API_TOKEN, or KAGGLE_USERNAME + KAGGLE_KEY"],
                      ["YouTube lectures", llm.integrations.youtube, "YOUTUBE_API_KEY"],
                      ["Admin email alerts", llm.integrations.email, "RESEND_API_KEY + ADMIN_NOTIFY_EMAIL"],
                      ["Firestore storage", llm.integrations.firestore, "STORE_BACKEND=firestore"],
                    ].map(([label, ok, hint]) => (
                      <li key={String(label)} className="flex items-center justify-between gap-3 py-2">
                        <span>
                          {String(label)}
                          {!ok && <span className="block text-xs text-muted-foreground">{String(hint)}</span>}
                        </span>
                        <Badge variant={ok ? "success" : "muted"}>{ok ? "connected" : "not set"}</Badge>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ytBusy}
                      onClick={async () => {
                        setYtBusy(true);
                        setYtTest(null);
                        try {
                          const r = await api.post<{ ok: boolean; message: string }>("/api/admin/youtube/test");
                          setYtTest(`${r.ok ? "OK: " : "Problem: "}${r.message}`);
                        } catch (e) {
                          setYtTest((e as Error).message);
                        } finally {
                          setYtBusy(false);
                        }
                      }}
                    >
                      {ytBusy && <Spinner />} Test YouTube
                    </Button>
                    {ytTest && <p className="min-w-0 flex-1 text-sm text-muted-foreground">{ytTest}</p>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Keys are read from the server environment and never shown here.</p>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
