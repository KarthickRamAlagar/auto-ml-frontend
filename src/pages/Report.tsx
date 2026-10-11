import { ArrowLeft, Download } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CodeBlock } from "@/components/chat/CodeBlock";
import { EdaView } from "@/components/chat/EdaView";
import { Leaderboard, ModelCard } from "@/components/chat/ModelCards";
import { BetaChip, LogoMark } from "@/components/Logo";
import { PaymentDrawer } from "@/components/pay/PaymentDrawer";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { api, ApiError } from "@/lib/api";
import { useSeo } from "@/lib/seo";
import type { JobView } from "@/lib/types";
import { PdfTitleDialog } from "@/components/chat/PdfTitleDialog";
import { pdfFileName } from "@/lib/brand";
import { buildReportPdf } from "@/lib/reportPdf";

export default function Report() {
  useSeo({ title: "Report · Auto ML", noindex: true });
  const { jobId = "" } = useParams();
  const [view, setView] = useState<JobView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [need, setNeed] = useState<{ price: number } | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [sp] = useSearchParams();
  const [making, setMaking] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [pdfErr, setPdfErr] = useState<string | null>(null);
  const [askTitle, setAskTitle] = useState(false);
  const auto = useRef(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      setView(await api.post<JobView>(`/api/reports/${jobId}/access`));
      setNeed(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        const d = e.detail as { price?: number };
        setNeed({ price: d.price ?? 5 });
        setDrawer(true);
      } else setErr((e as Error).message);
    }
  }, [jobId]);
  useEffect(() => void load(), [load]);

  const defaultTitle = view ? `${view.config.task[0].toUpperCase()}${view.config.task.slice(1)} report - ${view.dataset.replace(/\.[a-z0-9]+$/i, "")}` : "Auto ML report";

  const download = useCallback(
    async (title: string) => {
      if (!view) return;
      setMaking(true);
      setPdfErr(null);
      try {
        await buildReportPdf([view], { title, filename: pdfFileName(title) }, setStage);
        setAskTitle(false);
      } catch (e) {
        setPdfErr((e as Error).message || "Could not build the PDF.");
        setAskTitle(false);
      } finally {
        setMaking(false);
        setStage(null);
      }
    },
    [view],
  );

  // ?download=1 opens the title question as soon as the report has loaded
  useEffect(() => {
    if (view && sp.get("download") === "1" && !auto.current) {
      auto.current = true;
      setAskTitle(true);
    }
  }, [view, sp]);

  if (err)
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <p className="text-destructive">{err}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/auto-ml">Back to workspace</Link>
        </Button>
      </div>
    );

  if (need)
    return (
      <div className="mx-auto max-w-md space-y-4 p-10 text-center">
        <h1 className="font-serif text-2xl">Report download</h1>
        <p className="text-sm text-muted-foreground">You've used your 2 free reports. This one costs ₹{need.price}.</p>
        <Button onClick={() => setDrawer(true)}>Pay ₹{need.price}</Button>
        <PaymentDrawer open={drawer} onOpenChange={setDrawer} jobId={jobId} kind="report" onClaimed={() => void load()} />
      </div>
    );

  if (!view)
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );

  const v = view.verdict;
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 print:px-0">
      <div className="no-print flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/auto-ml">
            <ArrowLeft /> Back
          </Link>
        </Button>
        <Button onClick={() => setAskTitle(true)} disabled={making}>
          {making ? <Spinner /> : <Download />} {making ? `${stage ?? "Building PDF"}…` : "Download PDF"}
        </Button>
      </div>
      <PdfTitleDialog open={askTitle} onOpenChange={setAskTitle} defaultTitle={defaultTitle} busy={making} stage={stage} onConfirm={(t) => void download(t)} />
      {pdfErr && <p className="no-print text-sm text-destructive">{pdfErr}</p>}

      <div className="space-y-6 bg-background">
      <header data-pdf className="flex items-center gap-3 border-b pb-4">
        <LogoMark className="size-9" />
        <div>
          <h1 className="flex flex-wrap items-center gap-2 font-serif text-2xl">
            Auto ML report <BetaChip />
          </h1>
          <p className="text-xs text-muted-foreground">
            {view.dataset} · {view.config.domain} {view.config.task} · target “{view.config.target}” · generated {new Date((view.generated_at ?? Date.now() / 1000) * 1000).toLocaleString("en-IN")} for {view.user_email}
          </p>
        </div>
      </header>

      <section data-pdf className="space-y-2">
        <h2 className="font-serif text-xl">Setup</h2>
        <ul className="list-disc space-y-0.5 pl-5 text-sm">
          <li>Split: {view.config.split}, {Math.round(view.config.test_size * 100)}% test</li>
          <li>Preparation: impute {view.config.preprocess.impute}, scale {view.config.preprocess.scale}, encode {view.config.preprocess.encode}, selection {view.config.preprocess.feature_selection}, reduction {view.config.preprocess.reduction}</li>
          <li>Models: {view.config.models.map((m) => `${m.id} (${m.tuning})`).join(", ")}</li>
        </ul>
      </section>

      {v && (
        <section data-pdf className="space-y-3">
          <h2 className="font-serif text-xl">Conclusion</h2>
          {v.text.map((t, i) => (
            <p key={i} className="text-[15px] leading-relaxed">
              {t}
            </p>
          ))}
          {view.narrative && <p className="rounded-md bg-muted/60 p-3 text-sm">{view.narrative.text}</p>}
          {v.warnings.map((w, i) => (
            <p key={i} className="text-sm text-warning">⚠ {w}</p>
          ))}
          {v.ranking.length > 0 && <Leaderboard verdict={v} />}
        </section>
      )}

      <section className="space-y-3">
        <h2 data-pdf className="font-serif text-xl">Model results</h2>
        {view.models.map((m) => (
          <div key={m.id} data-pdf>
            <ModelCard m={m} winner={v?.winner?.id === m.id} />
          </div>
        ))}
      </section>

      {view.eda && (
        <section className="print-break space-y-3">
          <h2 data-pdf className="font-serif text-xl">Exploratory data analysis</h2>
          <div data-pdf>
            <EdaView eda={view.eda} printAll />
          </div>
        </section>
      )}

      {view.script && (
        <section className="print-break space-y-2">
          <h2 data-pdf className="font-serif text-xl">Code</h2>
          <div data-pdf>
            <CodeBlock code={view.script} maxHeight="none" />
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
