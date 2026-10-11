import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { Table2, BarChart3 } from "lucide-react";
import { cn, fmtNum } from "@/lib/utils";

const TICK = { fill: "var(--viz-muted)", fontSize: 11 } as const;
const AXIS = { stroke: "var(--viz-axis)" } as const;

function TooltipBox({ active, payload, label, unit }: { active?: boolean; payload?: { value?: number | string; name?: string }[]; label?: string | number; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="tabular-nums text-muted-foreground">
          {p.name && p.name !== "value" ? `${p.name}: ` : ""}
          {typeof p.value === "number" ? fmtNum(p.value, 3) : p.value}
          {unit ?? ""}
        </p>
      ))}
    </div>
  );
}

export interface Row {
  label: string;
  value: number;
}

/** Card with a chart and an accessible table view of the same data. */
export function ChartCard({
  title,
  subtitle,
  rows,
  valueLabel = "Value",
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  rows?: Row[];
  valueLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const [table, setTable] = useState(false);
  return (
    <figure className={cn("rounded-lg border bg-[var(--viz-surface)] p-4 print-break", className)}>
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <span>
          <span className="block font-serif text-[15px] font-medium text-[var(--viz-ink)]">{title}</span>
          {subtitle && <span className="block text-xs text-[var(--viz-ink-2)]">{subtitle}</span>}
        </span>
        {rows && rows.length > 0 && (
          <button
            type="button"
            onClick={() => setTable((t) => !t)}
            className="no-print inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--viz-ink-2)] hover:bg-muted"
            aria-pressed={table}
          >
            {table ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
            {table ? "Chart" : "Table"}
          </button>
        )}
      </figcaption>
      {table && rows ? (
        <div className="scroll-thin max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[var(--viz-ink-2)]">
                <th className="py-1 font-medium">Item</th>
                <th className="py-1 text-right font-medium">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t">
                  <td className="py-1 pr-2">{r.label}</td>
                  <td className="py-1 text-right tabular-nums">{fmtNum(r.value, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
}

/** Horizontal bars with the value shown at the end of each bar. */
export function BarList({
  data,
  color = "var(--series-1)",
  format = (v: number) => fmtNum(v, 3),
  highlight,
  domain,
}: {
  data: Row[];
  color?: string;
  format?: (v: number) => string;
  highlight?: string;
  domain?: [number, number];
}) {
  const height = Math.max(90, data.length * 30 + 20);
  return (
    <div style={{ height }} role="img" aria-label={`Bar chart with ${data.length} bars`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 52, top: 2, bottom: 2 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
          <XAxis type="number" hide domain={domain ?? [0, "dataMax"]} />
          <YAxis type="category" dataKey="label" width={118} tick={{ ...TICK, fontSize: 12, fill: "var(--viz-ink-2)" }} axisLine={AXIS} tickLine={false} interval={0} />
          <Tooltip cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }} content={<TooltipBox />} />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            maxBarSize={16}
            label={{ position: "right", fill: "var(--viz-ink-2)", fontSize: 11, formatter: (v: unknown) => format(Number(v)) }}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.label} fill={color} fillOpacity={highlight && d.label !== highlight ? 0.55 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical columns (histograms, daily series). */
export function Columns({
  data,
  color = "var(--series-1)",
  height = 180,
  xInterval = "preserveStartEnd",
  unit,
}: {
  data: Row[];
  color?: string;
  height?: number;
  xInterval?: number | "preserveStartEnd";
  unit?: string;
}) {
  return (
    <div style={{ height }} role="img" aria-label={`Column chart with ${data.length} columns`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -8, right: 4, top: 6, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="label" tick={TICK} axisLine={AXIS} tickLine={false} interval={xInterval} minTickGap={24} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} allowDecimals={false} />
          <Tooltip cursor={{ fill: "var(--viz-grid)", opacity: 0.4 }} content={<TooltipBox unit={unit} />} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineTrend({
  data,
  xKey,
  yKey,
  color = "var(--series-1)",
  height = 180,
  yDomain,
  xLabel,
}: {
  data: Record<string, number | string | null>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
  xLabel?: string;
}) {
  return (
    <div style={{ height }} role="img" aria-label="Line chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -8, right: 12, top: 6, bottom: xLabel ? 14 : 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey={xKey} tick={TICK} axisLine={AXIS} tickLine={false} label={xLabel ? { value: xLabel, position: "insideBottom", offset: -8, fill: "var(--viz-muted)", fontSize: 11 } : undefined} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} width={48} domain={yDomain ?? ["auto", "auto"]} tickFormatter={(v: number) => fmtNum(v, 2)} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: "var(--viz-axis)" }} />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, stroke: "var(--viz-surface)", strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Correlation heatmap: diverging blue (positive) / red (negative) around a neutral midpoint. */
export function CorrHeatmap({ columns, matrix }: { columns: string[]; matrix: (number | null)[][] }) {
  const n = columns.length;
  const short = (s: string) => (s.length > 11 ? s.slice(0, 10) + "…" : s);
  return (
    <div className="scroll-thin overflow-x-auto">
      <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `88px repeat(${n}, minmax(34px, 1fr))` }} role="table" aria-label="Correlation matrix">
        <div />
        {columns.map((c) => (
          <div key={c} className="pb-1 text-center text-[10px] leading-tight text-[var(--viz-ink-2)]" title={c}>
            {short(c)}
          </div>
        ))}
        {matrix.map((row, i) => (
          <div key={columns[i]} className="contents" role="row">
            <div className="flex items-center pr-1 text-[11px] text-[var(--viz-ink-2)]" title={columns[i]}>
              {short(columns[i])}
            </div>
            {row.map((v, j) => {
              const pct = v == null ? 0 : Math.round(Math.min(1, Math.abs(v)) * 100);
              const arm = v != null && v < 0 ? "var(--div-neg)" : "var(--div-pos)";
              return (
                <div
                  key={j}
                  role="cell"
                  title={`${columns[i]} × ${columns[j]}: ${v == null ? "n/a" : v.toFixed(2)}`}
                  className="relative grid aspect-square min-h-[34px] place-items-center overflow-hidden rounded-[3px] text-[10px] tabular-nums"
                  style={{ background: "var(--div-mid)", color: pct > 55 ? "#fff" : "var(--viz-ink)" }}
                >
                  {/* an opacity overlay instead of color-mix(), so PDF export (html2canvas) can render it */}
                  <span className="absolute inset-0" style={{ background: arm, opacity: pct / 100 }} aria-hidden />
                  <span className="relative">{v == null ? "–" : v.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--viz-ink-2)]">
        <span>−1</span>
        <span className="h-2 w-40 rounded-full" style={{ background: "linear-gradient(90deg, var(--div-neg), var(--div-mid), var(--div-pos))" }} aria-hidden />
        <span>+1</span>
      </div>
    </div>
  );
}

/** Confusion matrix: one-hue sequential scale on row-normalised counts. */
export function ConfusionMatrix({ labels, matrix }: { labels: string[]; matrix: number[][] }) {
  const short = (s: string) => (s.length > 9 ? s.slice(0, 8) + "…" : s);
  return (
    <div className="scroll-thin overflow-x-auto">
      <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `64px repeat(${labels.length}, minmax(34px, 1fr))` }} role="table" aria-label="Confusion matrix">
        <div className="pb-1 text-[10px] text-[var(--viz-muted)]">actual ↓ / predicted →</div>
        {labels.map((l) => (
          <div key={l} className="pb-1 text-center text-[10px] text-[var(--viz-ink-2)]" title={l}>
            {short(l)}
          </div>
        ))}
        {matrix.map((row, i) => {
          const total = row.reduce((a, b) => a + b, 0) || 1;
          return (
            <div key={labels[i]} className="contents" role="row">
              <div className="flex items-center text-[10px] text-[var(--viz-ink-2)]" title={labels[i]}>
                {short(labels[i])}
              </div>
              {row.map((v, j) => {
                const pct = Math.round((v / total) * 100);
                return (
                  <div
                    key={j}
                    role="cell"
                    title={`actual ${labels[i]}, predicted ${labels[j]}: ${v}`}
                    className="relative grid min-h-[34px] place-items-center overflow-hidden rounded-[3px] text-[11px] tabular-nums"
                    style={{ background: "var(--viz-grid)", color: pct > 55 ? "#fff" : "var(--viz-ink)" }}
                  >
                    <span className="absolute inset-0" style={{ background: "var(--series-1)", opacity: pct / 100 }} aria-hidden />
                    <span className="relative">{v}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}


const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)"];

/** ROC curves: one line per class (binary: one line), with the chance diagonal. */
export function RocChart({ curves }: { curves: { label: string; auc: number; fpr: number[]; tpr: number[] }[] }) {
  return (
    <div>
      <div style={{ height: 240 }} role="img" aria-label="ROC curve">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: -4, right: 12, top: 6, bottom: 16 }}>
            <CartesianGrid stroke="var(--viz-grid)" />
            <XAxis type="number" dataKey="x" domain={[0, 1]} tick={TICK} axisLine={AXIS} tickLine={false} label={{ value: "False positive rate", position: "insideBottom", offset: -8, fill: "var(--viz-muted)", fontSize: 11 }} />
            <YAxis type="number" dataKey="y" domain={[0, 1]} tick={TICK} axisLine={false} tickLine={false} width={40} label={{ value: "True positive rate", angle: -90, position: "insideLeft", fill: "var(--viz-muted)", fontSize: 11 }} />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="var(--viz-axis)" strokeDasharray="4 4" />
            <Tooltip content={<TooltipBox />} cursor={{ stroke: "var(--viz-axis)" }} />
            {curves.map((c, i) => (
              <Scatter key={c.label} name={`${c.label} (AUC ${c.auc.toFixed(3)})`} data={c.fpr.map((x, k) => ({ x, y: c.tpr[k] }))} line={{ stroke: SERIES[i % SERIES.length], strokeWidth: 2 }} lineType="joint" fill={SERIES[i % SERIES.length]} shape={() => <g />} isAnimationActive={false} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--viz-ink-2)]">
        {curves.map((c, i) => (
          <li key={c.label} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: SERIES[i % SERIES.length] }} aria-hidden />
            {c.label}: AUC {c.auc.toFixed(3)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Regression plot: actual vs predicted, with the perfect-prediction diagonal. */
export function RegressionPlot({ plot }: { plot: { actual: number[]; pred: number[]; min: number; max: number } }) {
  const data = plot.actual.map((a, i) => ({ x: a, y: plot.pred[i] }));
  return (
    <div style={{ height: 260 }} role="img" aria-label="Actual versus predicted values">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ left: -4, right: 12, top: 6, bottom: 16 }}>
          <CartesianGrid stroke="var(--viz-grid)" />
          <XAxis type="number" dataKey="x" name="Actual" domain={["auto", "auto"]} tick={TICK} axisLine={AXIS} tickLine={false} tickFormatter={(v: number) => fmtNum(v, 2)} label={{ value: "Actual", position: "insideBottom", offset: -8, fill: "var(--viz-muted)", fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Predicted" domain={["auto", "auto"]} tick={TICK} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => fmtNum(v, 2)} label={{ value: "Predicted", angle: -90, position: "insideLeft", fill: "var(--viz-muted)", fontSize: 11 }} />
          <ReferenceLine segment={[{ x: plot.min, y: plot.min }, { x: plot.max, y: plot.max }]} stroke="var(--viz-axis)" strokeDasharray="4 4" />
          <Tooltip content={<TooltipBox />} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter name="Test rows" data={data} fill="var(--series-1)" fillOpacity={0.6} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/** K-fold cross-validation: one bar per fold. */
export function CvBars({ folds, mean }: { folds: number[]; mean: number }) {
  const data = folds.map((v, i) => ({ label: `Fold ${i + 1}`, value: v }));
  return (
    <div style={{ height: 150 }} role="img" aria-label="Cross-validation scores per fold">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -8, right: 12, top: 6, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="label" tick={TICK} axisLine={AXIS} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => fmtNum(v, 2)} />
          <ReferenceLine y={mean} stroke="var(--series-2)" strokeDasharray="4 4" />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--viz-grid)" }} />
          <Bar dataKey="value" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
