import { PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ResetCountdown } from "@/components/layout/UsageMeter";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { Quote } from "@/lib/types";
import { cn, fmtInr } from "@/lib/utils";

export function Ledger({ q, className }: { q: Quote | { lines: { label: string; amount: number }[]; total: number; gross?: number }; className?: string }) {
  return (
    <dl className={cn("space-y-1 text-sm", className)}>
      {q.lines.map((l, i) => (
        <div key={i} className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{l.label}</dt>
          <dd className={cn("tabular-nums", l.amount < 0 && "text-success")}>{l.amount < 0 ? `−${fmtInr(-l.amount)}` : fmtInr(l.amount)}</dd>
        </div>
      ))}
      <div className="flex justify-between border-t pt-1.5 font-medium">
        <dt>Total</dt>
        <dd className="tabular-nums">{fmtInr(q.total)}</dd>
      </div>
    </dl>
  );
}

export function ConfirmCard({
  modelCount,
  methods = 0,
  rows,
  done,
  onRun,
  onEdit,
  onCancel,
}: {
  modelCount: number;
  methods?: number;
  rows: { label: string; value: string }[];
  done?: boolean;
  onRun: (o: { videos: boolean; team: boolean }) => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const [videos, setVideos] = useState(false);
  const [team, setTeam] = useState(false);
  const [q, setQ] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setErr(null);
    api
      .post<Quote>("/api/quote", { models: modelCount, methods, videos, team })
      .then((r) => alive && setQ(r))
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [modelCount, methods, videos, team]);

  if (done) return null;
  const blocked = q ? q.within_cap === false : false;

  return (
    <div className="space-y-4 rounded-xl border-2 border-primary/30 bg-card p-4 shadow-sm">
      <div>
        <p className="font-serif text-[16px] font-medium">Ready to run. Allow me to train these models?</p>
        <p className="text-[13px] text-muted-foreground">Your data stays in memory for this run only and is deleted when it finishes.</p>
      </div>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2 rounded-lg bg-muted/60 p-3 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={videos} onChange={(e) => setVideos(e.target.checked)} />
          <span>
            Add a video lecture for every model <span className="text-muted-foreground">(₹2 per model)</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={team} onChange={(e) => setTeam(e.target.checked)} />
          <span>
            We are a team of 2 <span className="text-muted-foreground">(+5% on the bill)</span>
          </span>
        </label>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {!q && !err && <Spinner />}
      {q && (
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Cost</p>
          {q.total === 0 ? (
            <p className="text-sm">
              <span className="font-medium text-success">Free.</span> {q.free_models} of your free runs will be used.
            </p>
          ) : (
            <>
              <Ledger q={q} />
              <p className="mt-2 text-xs text-muted-foreground">Nothing is charged now. Pay after training; take the optional quiz first to earn a discount (₹0.25 per correct answer, max 50% off).</p>
            </>
          )}
        </div>
      )}
      {blocked && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          This would exceed your 25-model window. Choose fewer models, or wait. <ResetCountdown />
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="outline" onClick={onEdit}>
          Edit choices
        </Button>
        <Button disabled={!q || blocked} onClick={() => onRun({ videos, team })}>
          <PlayCircle /> Allow &amp; run
        </Button>
      </div>
    </div>
  );
}
