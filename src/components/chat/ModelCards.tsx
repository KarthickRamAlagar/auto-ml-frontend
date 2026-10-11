import { Lock, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ModelResult, Verdict } from "@/lib/types";
import { fmtNum } from "@/lib/utils";
import { TreeView } from "./TreeView";
import { BarList, ChartCard, ConfusionMatrix, CvBars, LineTrend, RegressionPlot, RocChart } from "./charts";

const label = (k: string) => ({ roc_auc: "ROC-AUC", r2: "R²", rmse: "RMSE", mae: "MAE", mse: "MSE" } as Record<string, string>)[k] ?? k.replace(/_/g, " ");
const TUNING: Record<string, string> = { grid: "auto grid search", grid_user: "your grid search", custom: "custom settings", default: "default settings" };

export function Leaderboard({ verdict }: { verdict: Verdict }) {
  const rows = verdict.ranking.map((r) => ({ label: r.name, value: r.score }));
  return (
    <ChartCard title="Model leaderboard" subtitle={`Ranked by ${verdict.metric} on the held-out test set`} rows={rows} valueLabel={verdict.metric}>
      <BarList data={rows} highlight={verdict.winner?.name} domain={[0, 1]} />
    </ChartCard>
  );
}

export function ModelCard({ m, winner }: { m: ModelResult; winner?: boolean }) {
  if (m.locked)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card/60 p-4">
        <Lock className="size-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{m.name}</p>
          <p className="text-xs text-muted-foreground">Locked. Pay for this run to see its code, metrics and charts.</p>
        </div>
      </div>
    );
  if (m.status === "error" || m.error)
    return (
      <div className="rounded-xl border border-destructive/40 bg-card p-4">
        <p className="text-sm font-medium">{m.name} failed</p>
        <p className="text-xs text-destructive">{m.error}</p>
      </div>
    );
  const metrics = Object.entries(m.metrics ?? {});
  const params = Object.entries((m.best_params ?? m.params ?? {}) as Record<string, unknown>);
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 print-break">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-serif text-[16px] font-medium">
          {m.name}
          {winner && (
            <Badge variant="success">
              <Trophy className="size-3" /> Best
            </Badge>
          )}
        </h4>
        <span className="text-xs text-muted-foreground">
          {TUNING[m.tuning ?? ""] ?? m.tuning} · trained in {fmtNum(m.train_seconds ?? null, 1)}s
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(([k, v]) => (
          <div key={k} className="rounded-md bg-muted/60 px-2.5 py-1.5">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label(k)}</dt>
            <dd className="font-medium tabular-nums">{fmtNum(v, 3)}</dd>
          </div>
        ))}
      </dl>
      {m.train_primary != null && m.primary != null && (
        <p className="text-xs text-muted-foreground">
          Train score {fmtNum(m.train_primary, 3)} vs test {fmtNum(m.primary, 3)}
          {m.train_primary - m.primary > 0.1 ? " — a large gap suggests overfitting." : "."}
        </p>
      )}
      {params.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{m.tuning === "grid" || m.tuning === "grid_user" ? "Best parameters: " : "Parameters: "}</span>
          {params.map(([k, v]) => `${k}=${String(v)}`).join(", ")}
          {m.cv_score != null && ` · CV score ${fmtNum(m.cv_score, 3)}`}
        </p>
      )}
      {m.cv && (
        <ChartCard title={`${m.cv.k}-fold cross-validation`} subtitle={`${m.cv.metric}: ${fmtNum(m.cv.mean, 3)} ± ${fmtNum(m.cv.std, 3)}${m.cv.sampled ? " (on a sample of the training rows)" : ""}`} rows={m.cv.folds.map((v, i) => ({ label: `Fold ${i + 1}`, value: v }))} valueLabel={m.cv.metric}>
          <CvBars folds={m.cv.folds} mean={m.cv.mean} />
        </ChartCard>
      )}
      {m.user_grid && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Your grid: </span>
          {Object.entries(m.user_grid).map(([k, v]) => `${k} ∈ {${v.map(String).join(", ")}}`).join("; ")}
        </p>
      )}
      {m.curve && m.curve.length > 1 && (
        <ChartCard title="Score vs K" subtitle="Cross-validated score for each K tried" rows={m.curve.map((c) => ({ label: `K=${c.k}`, value: c.score ?? 0 }))} valueLabel="CV score">
          <LineTrend data={m.curve.map((c) => ({ k: c.k, score: c.score }))} xKey="k" yKey="score" xLabel="K (neighbours)" />
        </ChartCard>
      )}
      {m.grid_top && m.grid_top.length > 1 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Top grid-search candidates</summary>
          <ul className="mt-1 space-y-0.5">
            {m.grid_top.map((g, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">{Object.entries(g.params).map(([k, v]) => `${k}=${String(v)}`).join(", ")}</span>
                <span className="tabular-nums">{fmtNum(g.score, 3)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {m.tree && (
        <ChartCard title="Decision tree" subtitle="The splits the model learned">
          <TreeView tree={m.tree} />
        </ChartCard>
      )}
      {m.report && (
        <ChartCard title="Classification report" subtitle={`Precision, recall and F1 per class · accuracy ${fmtNum(m.report.accuracy, 3)}`}>
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[var(--viz-ink-2)]">
                <tr>
                  <th className="py-1 pr-3 font-medium">Class</th>
                  <th className="py-1 pr-3 text-right font-medium">Precision</th>
                  <th className="py-1 pr-3 text-right font-medium">Recall</th>
                  <th className="py-1 pr-3 text-right font-medium">F1</th>
                  <th className="py-1 text-right font-medium">Support</th>
                </tr>
              </thead>
              <tbody>
                {m.report.rows.map((r) => (
                  <tr key={r.label} className="border-t">
                    <td className="py-1 pr-3">{r.label}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{fmtNum(r.precision, 3)}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{fmtNum(r.recall, 3)}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{fmtNum(r.f1, 3)}</td>
                    <td className="py-1 text-right tabular-nums">{r.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
      {m.roc && m.roc.length > 0 && (
        <ChartCard title="ROC curve" subtitle={m.roc.length === 1 ? "Closer to the top-left corner is better; the dashed line is random guessing" : "One curve per class (one-vs-rest)"}>
          <RocChart curves={m.roc} />
        </ChartCard>
      )}
      {m.reg_plot && (
        <ChartCard title="Regression plot" subtitle={`Actual vs predicted on test rows · residual mean ${fmtNum(m.reg_plot.residual_mean, 3)}, std ${fmtNum(m.reg_plot.residual_std, 3)}`}>
          <RegressionPlot plot={m.reg_plot} />
        </ChartCard>
      )}
      {m.confusion && (
        <ChartCard title="Confusion matrix" subtitle="Rows are actual classes, columns are predicted">
          <ConfusionMatrix labels={m.confusion.labels} matrix={m.confusion.matrix} />
        </ChartCard>
      )}
      {m.notes?.map((n, i) => (
        <p key={i} className="text-xs text-muted-foreground">
          {n}
        </p>
      ))}
    </div>
  );
}
