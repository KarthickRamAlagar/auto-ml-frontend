import { Check, Lock, Scale, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BalancingMethod, MethodAdvice, MethodsMeta, SelectionMethod } from "@/lib/types";
import { cn, fmtInr } from "@/lib/utils";
import { BarList, ChartCard } from "./charts";

const BAL_ORDER: BalancingMethod[] = ["class_weight", "smote", "oversample", "undersample"];
const SEL_ORDER: SelectionMethod[] = ["kbest", "mutual_info", "variance", "rfe", "lasso", "tree"];

function CostNote({ count, otherCount, free, price }: { count: number; otherCount: number; free: number; price: number }) {
  const total = count + otherCount;
  const extra = Math.max(0, total - free);
  return (
    <p className="text-xs text-muted-foreground">
      {total} method{total === 1 ? "" : "s"} chosen in this run · the first {free} are free, each one after costs {fmtInr(price)}.{" "}
      {extra > 0 ? <b className="text-foreground">{extra} extra = {fmtInr(extra * price)}</b> : <span className="text-success">Currently free.</span>}
      {count > 1 && " With several methods I test each on a quick baseline and keep the best one."}
    </p>
  );
}

function Options<T extends string>({
  ids,
  info,
  recommended,
  selected,
  onToggle,
}: {
  ids: T[];
  info: Record<string, { name: string; blurb: string }>;
  recommended: T[];
  selected: T[];
  onToggle: (id: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="group">
      {ids.map((id) => {
        const on = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(id)}
            className={cn("flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent/60", on && "border-primary bg-primary/5")}
          >
            <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "bg-muted")}>{on && <Check className="size-3.5" />}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {info[id]?.name ?? id}
                {recommended.includes(id) && <Badge>Recommended</Badge>}
              </span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">{info[id]?.blurb}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** After EDA: is balancing required, and which methods to use. Classification only. */
export function BalanceCard({
  advice,
  otherCount,
  onSubmit,
}: {
  advice: MethodAdvice;
  otherCount: number;
  onSubmit: (methods: BalancingMethod[], summary: string) => void;
}) {
  const b = advice.balancing;
  const [sel, setSel] = useState<BalancingMethod[]>(b.recommended);
  const toggle = (id: BalancingMethod) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const dist = b.distribution.map((d) => ({ label: d.label, value: d.count }));
  const name = (id: string) => advice.info.balancing[id]?.name ?? id;
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <Scale className="mt-0.5 size-5 text-primary" />
        <div>
          <p className="font-serif text-[16px] font-medium">Is data balancing needed?</p>
          <p className={cn("text-[13px]", b.required ? "text-warning" : "text-muted-foreground")}>
            <b>{b.required ? "Yes, recommended." : b.recommended.length ? "Optional." : "Not required."}</b> {b.reason}
          </p>
        </div>
      </div>
      {dist.length > 1 && (
        <ChartCard title="Target classes" subtitle={b.ratio ? `Largest class is ${b.ratio}x the smallest` : undefined} rows={dist} valueLabel="rows">
          <BarList data={dist} />
        </ChartCard>
      )}
      <Options ids={BAL_ORDER} info={advice.info.balancing} recommended={b.recommended} selected={sel} onToggle={toggle} />
      <CostNote count={sel.length} otherCount={otherCount} free={advice.free_methods} price={advice.method_price} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => onSubmit([], "no balancing")}>
          Skip balancing
        </Button>
        {b.recommended.length > 0 && (
          <Button variant="outline" onClick={() => onSubmit(b.recommended, b.recommended.map(name).join(" + "))}>
            Use recommended
          </Button>
        )}
        <Button disabled={sel.length === 0} onClick={() => onSubmit(sel, sel.map(name).join(" + "))}>
          Apply my choice
        </Button>
      </div>
    </div>
  );
}

/** After preprocessing: feature-selection methods. */
export function SelectionCard({
  advice,
  otherCount,
  featureCount,
  onSubmit,
}: {
  advice: MethodAdvice;
  otherCount: number;
  featureCount: number;
  onSubmit: (methods: SelectionMethod[], k: number, summary: string) => void;
}) {
  const s = advice.selection;
  const [sel, setSel] = useState<SelectionMethod[]>(s.recommended);
  const [k, setK] = useState(Math.max(3, Math.min(20, Math.round(featureCount / 2))));
  const toggle = (id: SelectionMethod) => setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const name = (id: string) => advice.info.selection[id]?.name ?? id;
  const needsK = sel.some((m) => ["kbest", "mutual_info", "rfe"].includes(m));
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <SlidersHorizontal className="mt-0.5 size-5 text-primary" />
        <div>
          <p className="font-serif text-[16px] font-medium">Which feature-selection methods should I try?</p>
          <p className={cn("text-[13px]", s.required ? "text-warning" : "text-muted-foreground")}>
            <b>{s.required ? "Recommended." : s.recommended.length ? "Optional." : "Not required."}</b> {s.reason}
          </p>
        </div>
      </div>
      <Options ids={SEL_ORDER} info={advice.info.selection} recommended={s.recommended} selected={sel} onToggle={toggle} />
      {needsK && (
        <label className="flex items-center gap-2 text-sm">
          Keep the top K =
          <Input type="number" min={1} max={200} className="h-8 w-20" value={k} onChange={(e) => setK(Math.max(1, Math.min(200, Number(e.target.value) || 10)))} />
          <span className="text-xs text-muted-foreground">features (after encoding)</span>
        </label>
      )}
      <CostNote count={sel.length} otherCount={otherCount} free={advice.free_methods} price={advice.method_price} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => onSubmit([], k, "no feature selection")}>
          Skip selection
        </Button>
        {s.recommended.length > 0 && (
          <Button variant="outline" onClick={() => onSubmit(s.recommended, k, s.recommended.map(name).join(" + "))}>
            Use recommended
          </Button>
        )}
        <Button disabled={sel.length === 0} onClick={() => onSubmit(sel, k, sel.map(name).join(" + "))}>
          Apply my choice
        </Button>
      </div>
    </div>
  );
}

const NAMES: Record<string, string> = {
  class_weight: "Class weights", oversample: "Random oversampling", smote: "SMOTE", undersample: "Random undersampling",
  kbest: "SelectKBest", variance: "Variance threshold", mutual_info: "Mutual information", rfe: "RFE", lasso: "L1 (Lasso)", tree: "Tree importance",
};

/** Result of the method comparison, shown with the results. */
export function MethodsResult({ methods }: { methods: MethodsMeta | undefined }) {
  if (!methods) return null;
  if (methods.locked)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card/60 p-4 text-sm text-muted-foreground">
        <Lock className="size-5" /> The balancing / feature-selection comparison unlocks with your payment for this run.
      </div>
    );
  const blocks = [
    { title: "Data balancing", d: methods.balancing },
    { title: "Feature selection", d: methods.selection },
  ].filter((x) => x.d && x.d.chosen);
  if (!blocks.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {blocks.map(({ title, d }) => (
        <div key={title} className="rounded-xl border bg-card p-4">
          <p className="mb-1 font-serif text-[15px] font-medium">{title}</p>
          <p className="text-sm">
            Used: <b>{NAMES[d!.chosen!] ?? d!.chosen}</b>
          </p>
          {d!.tried.length > 1 && (
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {d!.tried.map((t) => (
                <li key={t.method} className="flex justify-between gap-3">
                  <span>{NAMES[t.method] ?? t.method}{t.method === d!.chosen ? " ✓" : ""}</span>
                  <span className="tabular-nums">{t.score != null ? `${d!.metric ?? "score"} ${t.score.toFixed(3)}` : "could not run"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
