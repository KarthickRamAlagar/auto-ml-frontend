import { ArrowLeft, Download } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { api, ApiError } from "@/lib/api";
import { PdfTitleDialog } from "@/components/chat/PdfTitleDialog";
import { pdfFileName } from "@/lib/brand";
import { buildReportPdf } from "@/lib/reportPdf";
import { useSeo } from "@/lib/seo";
import type { Chat, JobView } from "@/lib/types";

/** Combined report for both task types of a main chat: /report/combined/:chatId */
export default function ReportCombined() {
  useSeo({ title: "Combined report · Auto ML", noindex: true });
  const { chatId = "" } = useParams();
  const [sp] = useSearchParams();
  const [runs, setRuns] = useState<JobView[] | null>(null);
  const [links, setLinks] = useState<Chat[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [askTitle, setAskTitle] = useState(false);
  const auto = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get<{ main: Chat; runs: Chat[] }>(`/api/chats/${chatId}/runs`);
        const done = r.runs.filter((c) => c.status === "done" && c.job_id);
        if (!done.length) throw new Error("Finish at least one run first.");
        setLinks(done);
        // both reports are opened at once; each one counts like a normal report download
        const views = await Promise.all(done.map((c) => api.post<JobView>(`/api/reports/${c.job_id}/access`)));
        if (alive) setRuns(views.sort((a, b) => (a.config.task < b.config.task ? -1 : 1)));
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 402) setErr("Report downloads cost ₹5 after your 2 free reports. Open each type's report from the main chat to pay for it.");
        else setErr((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [chatId]);

  const defaultTitle = runs ? `Classification + regression - ${runs[0].dataset.replace(/\.[a-z0-9]+$/i, "")}` : "Auto ML report";

  const download = useCallback(
    async (title: string) => {
      if (!runs) return;
      setMaking(true);
      try {
        await buildReportPdf(runs, { title, filename: pdfFileName(title) }, setStage);
      } catch (e) {
        setErr((e as Error).message || "Could not build the PDF.");
      } finally {
        setMaking(false);
        setStage(null);
        setAskTitle(false);
      }
    },
    [runs],
  );

  useEffect(() => {
    if (runs && sp.get("download") === "1" && !auto.current) {
      auto.current = true;
      setAskTitle(true);
    }
  }, [runs, sp]);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/auto-ml/chat/${chatId}`}>
          <ArrowLeft /> Back to the chat
        </Link>
      </Button>
      <h1 className="font-serif text-2xl">Combined report</h1>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {err && links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((c) => (
            <Button key={c.id} variant="outline" size="sm" asChild>
              <Link to={`/report/${c.job_id}`}>{c.task} report</Link>
            </Button>
          ))}
        </div>
      )}
      {!err && !runs && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Collecting both runs…
        </p>
      )}
      {runs && (
        <>
          <p className="text-sm text-muted-foreground">
            {runs.map((r) => r.config.task).join(" and ")} on {runs[0].dataset}. One PDF with the comparison, results, data analysis and code for each.
          </p>
          <Button onClick={() => setAskTitle(true)} disabled={making}>
            {making ? <Spinner /> : <Download />} {making ? `${stage ?? "Building PDF"}…` : "Download PDF"}
          </Button>
          <PdfTitleDialog open={askTitle} onOpenChange={setAskTitle} defaultTitle={defaultTitle} busy={making} stage={stage} onConfirm={(t) => void download(t)} />
        </>
      )}
    </div>
  );
}
