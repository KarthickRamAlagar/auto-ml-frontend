import { ArrowRight, Download, FileText, GitCompare, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { chatPath } from "@/lib/ids";
import type { Chat, JobView, MethodsMeta } from "@/lib/types";
import { downloadText, fmtNum } from "@/lib/utils";

interface Run {
  chat: Chat;
  view: JobView | null;
}

const KEY_METRICS: Record<string, [string, string][]> = {
  classification: [["accuracy", "Accuracy"], ["precision", "Precision"], ["recall", "Recall"], ["f1", "F1 (weighted)"], ["roc_auc", "ROC-AUC"]],
  regression: [["r2", "R²"], ["rmse", "RMSE"], ["mae", "MAE"]],
};

const NAMES: Record<string, string> = {
  class_weight: "Class weights", oversample: "Oversampling", smote: "SMOTE", undersample: "Undersampling",
  kbest: "SelectKBest", variance: "Variance threshold", mutual_info: "Mutual information", rfe: "RFE", lasso: "Lasso (L1)", tree: "Tree importance",
};

function bestOf(v: JobView | null) {
  const w = v?.verdict?.winner;
  return w ? v?.models.find((m) => m.id === w.id) : undefined;
}

function methodsText(v: JobView | null): string {
  const m = v?.meta?.methods as MethodsMeta | undefined;
  if (!m || m.locked) return m?.locked ? "locked until payment" : "none";
  const parts = [m.balancing?.chosen && `balancing: ${NAMES[m.balancing.chosen] ?? m.balancing.chosen}`, m.selection?.chosen && `selection: ${NAMES[m.selection.chosen] ?? m.selection.chosen}`].filter(Boolean);
  return parts.length ? parts.join("; ") : "none";
}

/** The main chat for one dataset: its classification and regression sub-chats, a comparison table, interpretations and code downloads. */
export function MainChat({ main }: { main: Chat }) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<{ runs: Chat[] }>(`/api/chats/${main.id}/runs`)
      .then(async (r) => {
        const out = await Promise.all(r.runs.map(async (c) => ({ chat: c, view: await api.get<JobView>(`/api/jobs/${c.job_id}`).catch(() => null) })));
        if (alive) setRuns(out);
      })
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [main.id]);

  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!runs)
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    );

  const done = runs.filter((r) => r.view?.status === "done");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-medium">{main.title}</h2>
        <p className="text-sm text-muted-foreground">
          {main.dataset} · {main.domain} · {runs.length === 2 ? "classification and regression" : runs[0]?.chat.task}
        </p>
      </div>

      <section aria-label="Sub-chats" className="grid gap-3 sm:grid-cols-2">
        {runs.map(({ chat, view }) => (
          <Link key={chat.id} to={chatPath(chat.id)} className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50">
            <MessageSquare className="mt-0.5 size-5 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-medium capitalize">
                {chat.task} <Badge variant={view?.status === "done" ? "success" : "default"}>{view?.status ?? chat.status}</Badge>
              </span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">
                Target: {view?.config.target ?? "–"} · {chat.winner ? `best: ${chat.winner.name}` : "no winner yet"}
              </span>
            </span>
            <ArrowRight className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </section>

      {done.length > 0 && (
        <section aria-label="Comparison" className="space-y-2">
          <h3 className="flex items-center gap-2 font-serif text-[16px] font-medium">
            <GitCompare className="size-4 text-primary" /> Comparison of the ML types
          </h3>
          <div className="scroll-thin overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium"> </th>
                  {done.map((r) => (
                    <th key={r.chat.id} className="px-3 py-2 font-medium capitalize">
                      {r.chat.task}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Target column", (v: JobView) => v.config.target],
                    ["Best model", (v: JobView) => v.verdict?.winner?.name ?? "–"],
                    ["Main score", (v: JobView) => (v.verdict?.winner ? `${v.verdict.metric}: ${fmtNum(v.verdict.winner.score, 3)}` : "–")],
                    ["Models compared", (v: JobView) => String(v.models.length)],
                    ["Balancing / selection", (v: JobView) => methodsText(v)],
                    ["Split", (v: JobView) => `${v.config.split}, ${Math.round(v.config.test_size * 100)}% test`],
                  ] as [string, (v: JobView) => string][]
                ).map(([label, f]) => (
                  <tr key={label} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{label}</td>
                    {done.map((r) => (
                      <td key={r.chat.id} className="px-3 py-2 font-medium">
                        {f(r.view!)}
                      </td>
                    ))}
                  </tr>
                ))}
                {(["classification", "regression"] as const).flatMap((t) => {
                  const rs = done.filter((r) => r.chat.task === t);
                  return rs.length
                    ? KEY_METRICS[t].map(([k, label]) => (
                        <tr key={`${t}-${k}`} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{label} (best model)</td>
                          {done.map((r) => (
                            <td key={r.chat.id} className="px-3 py-2 tabular-nums">
                              {r.chat.task === t ? fmtNum(bestOf(r.view)?.metrics?.[k] ?? null, 3) : "–"}
                            </td>
                          ))}
                        </tr>
                      ))
                    : [];
                })}
                <tr className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">K-fold CV (best model)</td>
                  {done.map((r) => {
                    const cv = bestOf(r.view)?.cv;
                    return (
                      <td key={r.chat.id} className="px-3 py-2 tabular-nums">
                        {cv ? `${fmtNum(cv.mean, 3)} ± ${fmtNum(cv.std, 3)}` : "–"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {done.map(({ chat, view }) => (
        <section key={chat.id} aria-label={`${chat.task} interpretation`} className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-serif text-[16px] font-medium capitalize">{chat.task}: interpretation</h3>
            <div className="flex flex-wrap gap-2">
              {view?.script && (
                <Button size="sm" variant="outline" onClick={() => downloadText(`${chat.task}_pipeline.py`, view.script ?? "", "text/x-python")}>
                  <Download /> {chat.task} code (.py)
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link to={`/report/${chat.job_id}?download=1`}>
                  <FileText /> {chat.task} report
                </Link>
              </Button>
            </div>
          </div>
          <div className="space-y-2 text-[15px] leading-relaxed">
            {view?.verdict?.text.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
            {view?.verdict?.warnings.map((w, i) => (
              <p key={i} className="text-sm text-warning">
                ⚠ {w}
              </p>
            ))}
          </div>
        </section>
      ))}
      {done.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Full report</p>
            <p className="text-xs text-muted-foreground">One PDF with the comparison, results, data analysis and code{done.length > 1 ? " for both types" : ""}.</p>
          </div>
          <Button asChild>
            <Link to={`/report/combined/${main.id}?download=1`}>
              <FileText /> Download combined PDF
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
