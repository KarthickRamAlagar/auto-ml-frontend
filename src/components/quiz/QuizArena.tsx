import { CheckCircle2, ShieldAlert, Timer, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress, Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { QuizDone, QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = QuizQuestion | QuizDone;
interface AnswerOut {
  correct: boolean;
  timed_out: boolean;
  finished: boolean;
  score: number;
}

/**
 * Deterrents only: browsers cannot truly block OS screenshots or a phone camera.
 * We block copy/cut/select/context-menu/drag/print shortcuts, hide the question when the window loses focus,
 * and tile a watermark with the user's email so any leaked capture is traceable.
 */
function useQuestionProtection(active: boolean, onHide: (hidden: boolean) => void) {
  useEffect(() => {
    if (!active) return;
    const stop = (e: Event) => e.preventDefault();
    const events = ["copy", "cut", "contextmenu", "dragstart", "selectstart"] as const;
    events.forEach((n) => document.addEventListener(n, stop));
    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "printscreen") {
        void navigator.clipboard?.writeText(" ").catch(() => undefined);
        onHide(true);
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && ["c", "p", "s", "u", "a", "x"].includes(k)) e.preventDefault();
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(k)) onHide(true);
      if (k === "f12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c", "s"].includes(k))) e.preventDefault();
    };
    document.addEventListener("keydown", key, true);
    document.addEventListener("keyup", key, true);
    const vis = () => onHide(document.visibilityState !== "visible");
    const blur = () => onHide(true);
    const focus = () => onHide(false);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    return () => {
      events.forEach((n) => document.removeEventListener(n, stop));
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("keyup", key, true);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
    };
  }, [active, onHide]);
}

function Watermark({ text }: { text: string }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='120'><text x='10' y='70' transform='rotate(-20 130 60)' font-size='13' font-family='sans-serif' fill='rgba(120,120,120,0.22)'>${text.replace(/[<>&'"]/g, "")}</text></svg>`;
  return <div className="pointer-events-none absolute inset-0 z-10" style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")` }} aria-hidden />;
}

export function QuizArena({ open, jobId, onFinish }: { open: boolean; jobId: string; onFinish: (score: number | null) => void }) {
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [left, setLeft] = useState(75);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<null | { correct: boolean; timed_out: boolean }>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const deadline = useRef(0);
  const scoreRef = useRef(0);
  const submitting = useRef(false);

  const onHide = useCallback((h: boolean) => setHidden(h), []);
  useQuestionProtection(open && !!item && !item.finished, onHide);

  const load = useCallback((q: Item) => {
    setItem(q);
    setPicked(null);
    setFeedback(null);
    if (!q.finished) {
      deadline.current = performance.now() + q.seconds_left * 1000;
      setLeft(q.seconds_left);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setErr(null);
    setItem(null);
    api
      .post<Item>("/api/quiz/start", { job_id: jobId })
      .then((q) => alive && load(q))
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [open, jobId, load]);

  const submit = useCallback(
    async (optionId: string | null) => {
      if (!item || item.finished || submitting.current) return;
      submitting.current = true;
      setBusy(true);
      try {
        const r = await api.post<AnswerOut>(`/api/quiz/${item.quiz_id}/answer`, { qid: item.qid, option_id: optionId });
        scoreRef.current = r.score;
        setFeedback({ correct: r.correct, timed_out: r.timed_out });
        await new Promise((res) => setTimeout(res, 1400));
        load(await api.get<Item>(`/api/quiz/${item.quiz_id}/current`));
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    },
    [item, load],
  );

  // countdown (client display only; the server enforces the real 75 s deadline)
  useEffect(() => {
    if (!open || !item || item.finished || feedback) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000));
      setLeft(s);
      if (s <= 0) void submit(null);
    }, 250);
    return () => clearInterval(t);
  }, [open, item, feedback, submit]);

  const q = item && !item.finished ? item : null;
  const total = q?.total ?? 7;
  const pct = q ? (left / q.question_seconds) * 100 : 0;
  const urgent = left <= 10;

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent hideClose className={cn("quiz-protected max-w-xl select-none overflow-hidden", hidden && "quiz-hidden")} onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <Watermark text={user?.email ?? "Auto ML"} />
        <DialogHeader className="relative z-20">
          <DialogTitle>Quiz arena</DialogTitle>
          <DialogDescription>Each correct answer takes ₹0.25 off your bill (up to half). {total} questions, 75 seconds each. Copying and screenshots are blocked.</DialogDescription>
        </DialogHeader>

        {err && (
          <div className="relative z-20 space-y-3">
            <p className="text-sm text-destructive">{err}</p>
            <Button variant="outline" onClick={() => onFinish(null)}>
              Close
            </Button>
          </div>
        )}

        {!item && !err && (
          <div className="relative z-20 grid place-items-center py-10">
            <Spinner />
          </div>
        )}

        {q && (
          <div className="quiz-content relative z-20 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Question {q.index + 1} of {q.total} · {q.domain}
              </span>
              <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", urgent ? "text-destructive" : "text-foreground")} aria-live="off">
                <Timer className="size-4" /> {left}s
              </span>
            </div>
            <Progress value={pct} label="Time left" barClassName={urgent ? "bg-destructive" : undefined} />
            <p className="font-serif text-[17px] leading-snug">{q.text}</p>
            <div className="space-y-2" role="radiogroup" aria-label="Answers">
              {q.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={picked === o.id}
                  disabled={busy || !!feedback}
                  onClick={() => setPicked(o.id)}
                  className={cn("flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/60 disabled:cursor-default", picked === o.id && "border-primary bg-primary/5")}
                >
                  <span className="mt-px grid size-5 shrink-0 place-items-center rounded bg-muted text-[11px] font-medium">{o.id}</span>
                  <span>{o.text}</span>
                </button>
              ))}
            </div>
            {feedback ? (
              <p className={cn("flex items-center gap-2 text-sm font-medium", feedback.correct ? "text-success" : "text-destructive")}>
                {feedback.correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                {feedback.correct ? "Correct" : feedback.timed_out ? "Time's up" : "Not quite"}
              </p>
            ) : (
              <div className="flex justify-end">
                <Button disabled={!picked || busy} onClick={() => void submit(picked)}>
                  Lock in answer
                </Button>
              </div>
            )}
          </div>
        )}

        {item?.finished && (
          <div className="quiz-content relative z-20 space-y-4">
            <p className="font-serif text-2xl">
              {item.score} / {item.total} correct
            </p>
            <div className="flex gap-1.5" aria-label="Per-question result">
              {item.per_question.map((p, i) => (
                <span key={i} title={p.domain} className={cn("grid size-7 place-items-center rounded-md text-xs font-medium", p.correct ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                  {i + 1}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Your discount is applied to the total in the payment step.</p>
            <div className="flex justify-end">
              <Button onClick={() => onFinish(item.score)}>Continue</Button>
            </div>
          </div>
        )}

        {hidden && q && (
          <div role="button" tabIndex={0} onClick={() => setHidden(false)} className="absolute inset-0 z-30 grid cursor-pointer place-items-center bg-card/95 p-6 text-center">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldAlert className="size-4" /> Question hidden while this window is not focused. Click here to continue. The timer keeps running.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
