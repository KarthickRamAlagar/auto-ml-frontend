import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pager, usePaged } from "@/components/ui/pager";
import { Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { EdaColumns, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Wide datasets: suggest the most informative columns for EDA and let the user adjust the selection. */
export function EdaColumnsCard({
  datasetId,
  target,
  task,
  done,
  onReady,
}: {
  datasetId: string;
  target: string;
  task: Task;
  done?: boolean;
  /** Called with the chosen columns, or null when the dataset is narrow enough to explore everything. */
  onReady: (cols: string[] | null, summary: string) => void;
}) {
  const [info, setInfo] = useState<EdaColumns | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .post<EdaColumns>("/api/datasets/eda-columns", { dataset_id: datasetId, target, task })
      .then((r) => {
        if (!alive) return;
        setInfo(r);
        setPicked(r.recommended);
        if (!r.wide) onReady(null, "all columns");
      })
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId, target, task]);

  const cols = info?.columns ?? [];
  const paged = usePaged(cols, 12);
  if (done || (info && !info.wide)) return null;
  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!info)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Checking which columns are worth exploring…
      </p>
    );

  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : p.length >= 40 ? p : [...p, c]));
  const skipped = Object.entries(info.skipped);

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <p className="font-serif text-[16px] font-medium">This dataset has {cols.length + skipped.length} feature columns. Which ones should the EDA cover?</p>
        <p className="text-[13px] text-muted-foreground">
          Charting everything would be unreadable, so I ranked the columns by how strongly they relate to “{target}” and pre-selected the top {info.recommended.length}. Change the selection if you know better.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setPicked(info.recommended)}>
          <Sparkles /> Recommended ({info.recommended.length})
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPicked(cols.slice(0, 20).map((c) => c.column))}>
          Top 20
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPicked([])}>
          Clear
        </Button>
        <span className="ml-auto self-center text-xs text-muted-foreground">{picked.length} selected (max 40)</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Columns for EDA">
        {paged.slice.map((c) => {
          const on = picked.includes(c.column);
          return (
            <button
              key={c.column}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(c.column)}
              className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/50", on && "border-primary bg-primary/5")}
            >
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{on && <Check className="size-3.5" />}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{c.column}</span>
                  {c.recommended && <Badge>Top</Badge>}
                </span>
                <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(c.score * 100)}%` }} />
                  </span>
                  <span className="tabular-nums">{c.score.toFixed(2)}</span> · {c.kind}
                  {c.missing_pct > 0 && ` · ${c.missing_pct}% missing`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <Pager {...paged} />
      {skipped.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">{skipped.length} column(s) skipped automatically</summary>
          <ul className="mt-1 space-y-0.5">
            {skipped.map(([c, why]) => (
              <li key={c}>
                <span className="font-medium text-foreground">{c}</span>: {why}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="flex justify-end">
        <Button disabled={picked.length === 0} onClick={() => onReady(picked, `${picked.length} of ${cols.length} columns`)}>
          Continue
        </Button>
      </div>
    </div>
  );
}
