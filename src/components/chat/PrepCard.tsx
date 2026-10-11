import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { DEFAULT_PREPROCESS, getPrefs } from "@/lib/prefs";
import type { ColumnInfo, Preprocess } from "@/lib/types";
import { cn } from "@/lib/utils";

const Rec = () => <Badge className="ml-1">Recommended</Badge>;

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{title}</p>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PrepCard({
  columns,
  target,
  done,
  onSubmit,
}: {
  columns: ColumnInfo[];
  target: string;
  done?: boolean;
  onSubmit: (p: Preprocess, summary: string) => void;
}) {
  const [p, setP] = useState<Preprocess>(DEFAULT_PREPROCESS(getPrefs().scale));
  const set = (patch: Partial<Preprocess>) => setP((x) => ({ ...x, ...patch }));
  const hasMissing = columns.some((c) => c.missing > 0);
  const hasCat = columns.some((c) => c.kind === "categorical");
  const droppable = columns.filter((c) => c.name !== target);

  const summarize = (x: Preprocess) =>
    [
      `impute: ${x.impute.replace("_", "/")}`,
      hasCat ? `encode: ${x.encode}` : null,
      `scale: ${x.scale}`,
      x.reduction === "pca" ? `PCA ${Math.round(x.pca_variance * 100)}%` : null,
      x.drop_columns.length ? `drop ${x.drop_columns.length} column(s)` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  if (done) return null;

  return (
    <div className="space-y-5 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <p className="font-serif text-[16px] font-medium">How should I prepare the data before training?</p>
        <p className="text-[13px] text-muted-foreground">Every step is fitted on the training rows only, so nothing leaks from the test set. Feature selection comes next.</p>
      </div>
      <Row title="Missing values" hint={hasMissing ? "This dataset has missing values." : "No missing values found; this will have no effect."}>
        <Segmented
          label="Missing values"
          value={p.impute}
          onChange={(impute) => set({ impute })}
          options={[
            { v: "median_mode", label: "Median / mode", badge: <Rec /> },
            { v: "mean_mode", label: "Mean / mode" },
            { v: "drop_rows", label: "Drop rows" },
          ]}
        />
      </Row>
      {hasCat && (
        <Row title="Categorical encoding" hint="One-hot suits most models. Ordinal is compact but implies an order.">
          <Segmented
            label="Encoding"
            value={p.encode}
            onChange={(encode) => set({ encode })}
            options={[
              { v: "onehot", label: "One-hot", badge: <Rec /> },
              { v: "ordinal", label: "Ordinal" },
            ]}
          />
        </Row>
      )}
      <Row title="Scaling / normalisation" hint="Needed for KNN, SVM, linear models and neural networks. Trees don't mind.">
        <Segmented
          label="Scaling"
          value={p.scale}
          onChange={(scale) => set({ scale })}
          options={[
            { v: "standard", label: "Standard (z-score)", badge: <Rec /> },
            { v: "minmax", label: "Min-max (0–1)" },
            { v: "robust", label: "Robust (outliers)" },
            { v: "none", label: "None" },
          ]}
        />
      </Row>
      <Row title="Dimensionality reduction">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Reduction"
            value={p.reduction}
            onChange={(reduction) => set({ reduction })}
            options={[
              { v: "none", label: "None", badge: <Rec /> },
              { v: "pca", label: "PCA" },
            ]}
          />
          {p.reduction === "pca" && (
            <label className="flex items-center gap-2 text-sm">
              Keep {Math.round(p.pca_variance * 100)}% variance
              <input type="range" min={0.8} max={0.99} step={0.01} value={p.pca_variance} onChange={(e) => set({ pca_variance: Number(e.target.value) })} aria-label="PCA variance to keep" />
            </label>
          )}
        </div>
      </Row>
      <Row title="Drop columns (optional)" hint="Remove IDs or leaky columns. Dates and ID-like text are dropped automatically.">
        <div className="scroll-thin flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {droppable.map((c) => {
            const on = p.drop_columns.includes(c.name);
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={on}
                onClick={() => set({ drop_columns: on ? p.drop_columns.filter((x) => x !== c.name) : [...p.drop_columns, c.name] })}
                className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs", on ? "border-destructive/50 bg-destructive/10 text-destructive line-through" : "hover:bg-accent")}
              >
                {on && <Check className="size-3" />}
                {c.name}
              </button>
            );
          })}
        </div>
      </Row>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => onSubmit(DEFAULT_PREPROCESS("standard"), "recommended defaults")}>
          Use recommended
        </Button>
        <Button onClick={() => onSubmit(p, summarize(p))}>Apply my choices</Button>
      </div>
    </div>
  );
}
