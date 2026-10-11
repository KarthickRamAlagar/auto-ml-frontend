import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Pager, usePaged } from "@/components/ui/pager";
import type { EdaData } from "@/lib/types";
import { cn, fmtInt, fmtNum } from "@/lib/utils";
import { Bento, Cell, Tile } from "./Bento";
import { BarList, ChartCard, Columns, CorrHeatmap } from "./charts";

const ICON = { info: Info, warn: AlertTriangle, good: CheckCircle2 } as const;
const TONE = { info: "text-muted-foreground", warn: "text-warning", good: "text-success" } as const;

export function EdaView({ eda, printAll }: { eda: EdaData; printAll?: boolean }) {
  const ov = eda.overview;
  const t = eda.target;
  const targetRows = t.classes ? t.classes.map((c) => ({ label: String(c.label), value: c.count })) : (t.bins ?? []).map((b) => ({ label: b.label, value: b.count }));
  const numCols = eda.numeric_summary.length ? Object.keys(eda.numeric_summary[0]) : [];
  const size = printAll ? 999 : undefined;
  const hist = usePaged(eda.histograms, size ?? 6);
  const cats = usePaged(eda.categorical, size ?? 4);
  const rowsP = usePaged(eda.numeric_summary, size ?? 8);
  const feats = usePaged(eda.columns ?? [], size ?? 10);
  const nObs = ov.rows ?? ov.observations ?? ov.n_rows;
  return (
    <div className="space-y-3">
      {eda.columns && eda.columns.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:max-w-md">
            <Tile label="Observations (rows)" value={fmtInt(nObs ?? 0)} />
            <Tile label="Columns" value={fmtInt(eda.columns.length)} />
          </div>
          <p className="mb-2 font-serif text-[15px] font-medium">Features</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3 font-medium">#</th>
                  <th className="py-1 pr-3 font-medium">Name</th>
                  <th className="py-1 pr-3 font-medium">Type</th>
                  <th className="py-1 pr-3 font-medium">Unique</th>
                  <th className="py-1 font-medium">Missing</th>
                </tr>
              </thead>
              <tbody>
                {feats.slice.map((c, i) => (
                  <tr key={c.name} className="border-t">
                    <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{feats.from + i}</td>
                    <td className="py-1.5 pr-3 font-medium">
                      {c.name}
                      {c.role === "target" && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-normal text-primary">target</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{c.kind}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{fmtInt(c.unique)}</td>
                    <td className="py-1.5 tabular-nums">{c.missing ? fmtInt(c.missing) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager {...feats} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(ov).map(([k, v]) => (
          <Tile key={k} label={k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())} value={fmtInt(v)} />
        ))}
      </div>

      <Bento>
        <Cell span={7}>
          <div className="h-full rounded-xl border bg-card p-4">
            <p className="mb-2 font-serif text-[15px] font-medium">What the data tells us</p>
            <ul className="space-y-1.5">
              {eda.inference.map((i, n) => {
                const Icon = ICON[i.level];
                return (
                  <li key={n} className="flex gap-2 text-sm">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[i.level])} />
                    <span>{i.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Cell>
        <Cell span={5}>
          <ChartCard className="h-full" title={`Target: ${t.column}`} subtitle={t.classes ? `Class balance${t.imbalance_ratio ? ` · imbalance ${fmtNum(t.imbalance_ratio, 1)}:1` : ""}` : `Mean ${fmtNum(t.mean ?? null, 2)} · std ${fmtNum(t.std ?? null, 2)} · skew ${fmtNum(t.skew ?? null, 2)}`} rows={targetRows} valueLabel="Rows">
            {t.classes ? <BarList data={targetRows} format={(v) => fmtInt(v)} /> : <Columns data={targetRows} />}
          </ChartCard>
        </Cell>

        {eda.missing.length > 0 && (
          <Cell span={5}>
            <ChartCard className="h-full" title="Missing values" subtitle="Share of rows missing, by column" rows={eda.missing.map((m) => ({ label: m.column, value: m.pct }))} valueLabel="% missing">
              <BarList data={eda.missing.slice(0, 10).map((m) => ({ label: m.column, value: m.pct }))} color="var(--series-3)" format={(v) => `${fmtNum(v, 1)}%`} />
            </ChartCard>
          </Cell>
        )}
        {eda.target_correlation.length > 0 && (
          <Cell span={eda.missing.length > 0 ? 7 : 12}>
            <ChartCard className="h-full" title="Correlation with target" subtitle="Pearson r (absolute strength, sorted)" rows={eda.target_correlation.map((c) => ({ label: c.column, value: c.r }))} valueLabel="r">
              <BarList data={eda.target_correlation.slice(0, 10).map((c) => ({ label: c.column, value: Math.abs(c.r) }))} color="var(--series-2)" />
            </ChartCard>
          </Cell>
        )}

        {eda.correlation.columns.length > 1 && (
          <Cell span={eda.top_pairs.length > 0 ? 7 : 12}>
            <ChartCard className="h-full" title="Correlation matrix" subtitle="Blue = positive, red = negative">
              <CorrHeatmap columns={eda.correlation.columns} matrix={eda.correlation.matrix} />
            </ChartCard>
          </Cell>
        )}
        {eda.top_pairs.length > 0 && (
          <Cell span={eda.correlation.columns.length > 1 ? 5 : 12}>
            <div className="h-full rounded-xl border bg-card p-4">
              <p className="mb-2 font-serif text-[15px] font-medium">Most correlated feature pairs</p>
              <ul className="space-y-1.5 text-sm">
                {eda.top_pairs.map((p, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {p.a} <span className="text-muted-foreground">↔</span> {p.b}
                    </span>
                    <span className="tabular-nums">{fmtNum(p.r, 2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Cell>
        )}
      </Bento>

      {eda.histograms.length > 0 && (
        <section>
          <p className="mb-2 font-serif text-[15px] font-medium">Distributions</p>
          <Bento>
            {hist.slice.map((h) => {
              const rows = h.bins.map((b) => ({ label: b.label, value: b.count }));
              return (
                <Cell key={h.column} span={4}>
                  <ChartCard title={h.column} rows={rows} valueLabel="Rows">
                    <Columns data={rows} height={150} />
                  </ChartCard>
                </Cell>
              );
            })}
          </Bento>
          <Pager {...hist} />
        </section>
      )}

      {eda.categorical.length > 0 && (
        <section>
          <p className="mb-2 font-serif text-[15px] font-medium">Categorical columns</p>
          <Bento>
            {cats.slice.map((c) => {
              const rows = c.values.map((v) => ({ label: String(v.label), value: v.count }));
              return (
                <Cell key={c.column} span={6}>
                  <ChartCard title={c.column} subtitle={`${c.unique} unique values`} rows={rows} valueLabel="Rows">
                    <BarList data={rows.slice(0, 8)} color="var(--series-4)" format={(v) => fmtInt(v)} />
                  </ChartCard>
                </Cell>
              );
            })}
          </Bento>
          <Pager {...cats} />
        </section>
      )}

      {numCols.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 font-serif text-[15px] font-medium">Numeric summary</p>
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  {numCols.map((c) => (
                    <th key={c} className="whitespace-nowrap py-1 pr-3 font-medium capitalize">
                      {c.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsP.slice.map((r, i) => (
                  <tr key={i} className="border-t">
                    {numCols.map((c) => (
                      <td key={c} className="whitespace-nowrap py-1 pr-3 tabular-nums">
                        {typeof r[c] === "number" ? fmtNum(r[c] as number, 3) : String(r[c] ?? "–")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager {...rowsP} />
        </div>
      )}
    </div>
  );
}
