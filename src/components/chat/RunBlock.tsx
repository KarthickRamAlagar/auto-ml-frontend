import { AlertCircle, Check, ChevronRight, Lock, Loader2, Swords, Terminal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PaymentDrawer } from "@/components/pay/PaymentDrawer";
import { PaymentStatusCard } from "@/components/pay/PaymentStatusCard";
import { notify } from "@/lib/notify";
import { QuizArena } from "@/components/quiz/QuizArena";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/progress";
import { api, streamJob } from "@/lib/api";
import { useMe } from "@/lib/me";
import { applyEvent } from "@/lib/steps";
import type { JobView, Payment, Step } from "@/lib/types";
import { cn, fmtMs } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { ResultsTabs } from "./ResultsTabs";

function StepRow({ s }: { s: Step }) {
  const [user, setUser] = useState<boolean | null>(null);
  const open = user ?? s.status === "running";
  const logsRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [s.logs.length]);
  const icon =
    s.status === "running" ? <Loader2 className="size-4 animate-spin text-primary" /> : s.status === "error" ? <AlertCircle className="size-4 text-destructive" /> : s.locked ? <Lock className="size-4 text-muted-foreground" /> : <Check className="size-4 text-success" />;
  return (
    <Collapsible open={open} onOpenChange={setUser} className="border-b last:border-b-0">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50">
        {icon}
        <span className="flex-1 truncate">{s.title}</span>
        {s.locked && <span className="text-xs text-muted-foreground">locked</span>}
        <span className="text-xs tabular-nums text-muted-foreground">{fmtMs(s.ms)}</span>
        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 px-3 pb-3">
          {s.locked && <p className="text-xs text-muted-foreground">Code and logs for this model unlock with payment.</p>}
          {s.code && <CodeBlock code={s.code} maxHeight="14rem" />}
          {s.logs.length > 0 && (
            <pre ref={logsRef} className="scroll-thin max-h-32 overflow-auto rounded-md bg-muted/70 p-2 font-mono text-[12px] leading-relaxed text-muted-foreground">
              {s.logs.join("\n")}
            </pre>
          )}
          {s.error && <p className="text-xs text-destructive">{s.error}</p>}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function RunBlock({ jobId, needsPayment, onFinished }: { jobId: string; needsPayment: boolean; onFinished?: (v: JobView) => void }) {
  const nav = useNavigate();
  const { refresh } = useMe();
  const [steps, setSteps] = useState<Step[]>([]);
  const [status, setStatus] = useState<"running" | "done" | "error">("running");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<JobView | null>(null);
  const [panel, setPanel] = useState(true);
  const [quiz, setQuiz] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState<number | null>(null);
  const [drawer, setDrawer] = useState<"models" | "report" | null>(null);
  const [, setPayNote] = useState<string | null>(null);
  const autoOpened = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view?.status === "done") resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [view?.status]);

  const loadView = useCallback(async () => {
    const v = await api.get<JobView>(`/api/jobs/${jobId}`);
    setView(v);
    return v;
  }, [jobId]);

  useEffect(() => {
    const ac = new AbortController();
    streamJob(
      jobId,
      (ev) => {
        setSteps((s) => applyEvent(s, ev));
        if (ev.type === "job_end") {
          setStatus(ev.status);
          setError(ev.error);
          setPanel(false);
        }
      },
      ac.signal,
    )
      .then(async () => {
        if (ac.signal.aborted) return;
        const v = await loadView();
        setStatus(v.status === "error" ? "error" : "done");
        notify(v.status === "error" ? "Your run stopped" : "Your models finished training", v.status === "error" ? "Open the chat to see what happened." : "Results are ready to view.");
        void refresh();
        onFinished?.(v);
      })
      .catch((e: Error) => {
        if (!ac.signal.aborted) {
          setStatus("error");
          setError(e.message);
        }
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const locked = !!view && view.locks.needs_payment && !view.locks.unlocked;
  const quizDone = quiz === "done";

  // After the quiz and once results are ready, open the payment drawer with the discounted total.
  useEffect(() => {
    if (view && locked && quizDone && !autoOpened.current) {
      autoOpened.current = true;
      setDrawer("models");
    }
  }, [view, locked, quizDone]);

  const finalizing = quizDone && status === "running";
  const running = status === "running";

  return (
    <div className="space-y-4">
      <Collapsible open={panel} onOpenChange={setPanel} className="overflow-hidden rounded-xl border bg-card">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-accent/50">
          <Terminal className="size-4 text-muted-foreground" />
          <span className="flex-1">
            {running ? "Running your pipeline…" : status === "error" ? "Run stopped" : "Ran your pipeline"}
            <span className="ml-2 font-normal text-muted-foreground">
              {steps.filter((s) => s.status === "done").length} of {steps.length} steps
            </span>
          </span>
          {running && <Spinner />}
          <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", panel && "rotate-90")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t">
            {steps.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">Starting up…</p>}
            {steps.map((s) => (
              <StepRow key={s.id} s={s} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {status === "error" && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ?? "Something went wrong."} Any model run that failed before training was refunded to your allowance.
        </p>
      )}

      {needsPayment && quiz === "idle" && status !== "error" && (running || locked) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
          <Swords className="size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Waiting for training? Play the 7-question quiz arena.</p>
            <p className="text-xs text-muted-foreground">Optional. Every correct answer takes ₹0.25 off your bill (up to 50%). 75 seconds per question.</p>
          </div>
          <Button size="sm" onClick={() => setQuiz("playing")}>
            Play
          </Button>
        </div>
      )}

      <QuizArena
        open={quiz === "playing"}
        jobId={jobId}
        onFinish={(s) => {
          setScore(s);
          setQuiz("done");
        }}
      />

      {finalizing && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Finalizing results…
        </p>
      )}
      {quizDone && score != null && !finalizing && <p className="text-sm text-muted-foreground">Quiz score: {score} / 7. Discount applied to your total.</p>}

      {view && view.status === "done" && (
        <div ref={resultsRef} className="scroll-mt-4 space-y-4">
          {view.locks.payment_id && <PaymentStatusCard key={view.locks.payment_id} paymentId={view.locks.payment_id} onDecided={() => void loadView()} />}
          {locked && (
            <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-4", view.locks.rejected ? "border-destructive/50 bg-destructive/5" : "border-primary/40 bg-primary/5")}>
              <Lock className="size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{view.locks.rejected
                    ? "Payment could not be verified. Your results are locked."
                    : [
                        (view.verdict?.locked_models ?? view.locks.locked_models) > 0 && `${view.verdict?.locked_models ?? view.locks.locked_models} model result(s)`,
                        view.locks.methods_locked && `the comparison of ${view.locks.paid_methods ?? 0} extra balancing / feature-selection method(s)`,
                      ]
                        .filter(Boolean)
                        .join(" and ") + " locked."}</p>
                <p className="text-xs text-muted-foreground">Unlock them by paying for this run. The free parts are shown below.</p>
              </div>
              <Button size="sm" onClick={() => setDrawer("models")}>
                {view.locks.rejected ? "Pay again" : "Pay & unlock"}
              </Button>
            </div>
          )}
          <ResultsTabs view={view} onReport={() => nav(`/report/${jobId}?download=1`)} />
        </div>
      )}

      <PaymentDrawer
        open={drawer !== null}
        onOpenChange={(o) => !o && setDrawer(null)}
        jobId={jobId}
        kind={drawer ?? "models"}
        onClaimed={async (msg: string, _p: Payment) => {
          setPayNote(msg);
          await loadView();
          void refresh();
        }}
      />
    </div>
  );
}
