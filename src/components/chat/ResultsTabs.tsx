import { BookOpen, Code2, Download, FileText, LineChart as LineIcon, Play, Sparkles, Table2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { Select } from "@/components/ui/input";
import { useMe } from "@/lib/me";
import type { JobView, Lecture, LectureSet, MethodsMeta } from "@/lib/types";
import { cn, downloadText, fmtNum } from "@/lib/utils";
import { Pager, usePaged } from "@/components/ui/pager";
import { BarList, ChartCard } from "./charts";
import { Bento, Cell, Tile } from "./Bento";
import { CodeBlock } from "./CodeBlock";
import { EdaView } from "./EdaView";
import { MethodsResult } from "./Methods";
import { Leaderboard, ModelCard } from "./ModelCards";

export function ResultsTabs({ view, onReport }: { view: JobView; onReport: () => void }) {
  const [story, setStory] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const v = view.verdict;
  const hasCode = view.steps.some((s) => s.code) || !!view.script;
  const paged = usePaged(view.models, 4);
  // Decision trees need the full width, and a card left alone in a row stretches so no row looks half-empty.
  const spans: [(typeof paged.slice)[number], 6 | 12][] = [];
  let open = false;
  for (const m of paged.slice) {
    if (m.tree) {
      if (open) spans[spans.length - 1][1] = 12;
      spans.push([m, 12]);
      open = false;
    } else {
      spans.push([m, 6]);
      open = !open;
    }
  }
  if (open) spans[spans.length - 1][1] = 12;
  const timeRows = view.models.filter((m) => !m.locked && m.train_seconds != null).map((m) => ({ label: m.name, value: m.train_seconds ?? 0 }));
  const totalSeconds = timeRows.reduce((a, r) => a + r.value, 0);

  const narrate = async () => {
    setBusy(true);
    setErr(null);
    try {
      setStory((await api.post<{ text: string }>(`/api/jobs/${view.id}/narrate`)).text);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Tabs defaultValue="results" className="w-full">
      <TabsList>
        <TabsTrigger value="results">
          <Table2 /> Results
        </TabsTrigger>
        <TabsTrigger value="eda" disabled={!view.eda}>
          <LineIcon /> EDA
        </TabsTrigger>
        <TabsTrigger value="code" disabled={!hasCode}>
          <Code2 /> Code
        </TabsTrigger>
        {view.config.videos && (
          <TabsTrigger value="lectures">
            <BookOpen /> Lectures
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="results" className="space-y-3">
        {v && (
          <Bento>
            <Cell span={7}>
              <div className="h-full rounded-xl border bg-card p-4">
                <p className="mb-2 font-serif text-[16px] font-medium">Conclusion</p>
                <div className="space-y-2 text-[15px] leading-relaxed">
                  {v.text.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                  {story && <p className="rounded-md bg-muted/60 p-3 text-sm">{story}</p>}
                </div>
                {v.warnings.map((w, i) => (
                  <p key={i} className="mt-2 text-sm text-warning">
                    ⚠ {w}
                  </p>
                ))}
                {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
                <div className="no-print mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy || !!story} onClick={narrate}>
                    {busy ? <Spinner /> : <Sparkles />} Explain in plain English
                  </Button>
                  <Button size="sm" variant="outline" onClick={onReport}>
                    <FileText /> Download report (PDF)
                  </Button>
                </div>
              </div>
            </Cell>
            <Cell span={5}>
              <div className="grid h-full grid-cols-2 gap-3">
                <Tile accent className="col-span-2" label="Best model" value={v.winner?.name ?? "–"} sub={v.winner ? `${v.metric} ${fmtNum(v.winner.score, 3)}` : undefined} />
                <Tile label="Models compared" value={String(view.models.length)} sub={v.locked_models ? `${v.locked_models} locked` : "all unlocked"} />
                <Tile label="Training time" value={`${fmtNum(totalSeconds, 1)} s`} sub="all models" />
                <Tile label="Test split" value={`${Math.round(view.config.test_size * 100)}%`} sub={view.config.split} />
                <Tile label="Target" value={view.config.target} sub={view.config.task} />
              </div>
            </Cell>
            {v.ranking.length > 0 && (
              <Cell span={7}>
                <Leaderboard verdict={v} />
              </Cell>
            )}
            {timeRows.length > 0 && (
              <Cell span={5}>
                <ChartCard title="Training time" subtitle="Seconds per model" rows={timeRows} valueLabel="seconds">
                  <BarList data={timeRows} color="var(--series-2)" format={(x) => `${fmtNum(x, 1)}s`} />
                </ChartCard>
              </Cell>
            )}
          </Bento>
        )}
        <MethodsResult methods={view.meta?.methods as MethodsMeta | undefined} />
        <Bento>
          {spans.map(([m, span]) => (
            <Cell key={m.id} span={span}>
              <ModelCard m={m} winner={v?.winner?.id === m.id} />
            </Cell>
          ))}
        </Bento>
        <Pager {...paged} />
      </TabsContent>

      {view.eda && (
        <TabsContent value="eda">
          <EdaView eda={view.eda} />
        </TabsContent>
      )}

      <TabsContent value="code" className="space-y-3">
        {view.script && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">One runnable script for everything above. Needs pandas and scikit-learn.</p>
            <Button size="sm" variant="outline" onClick={() => downloadText("auto_ml_pipeline.py", view.script ?? "", "text/x-python")}>
              <Download /> Download .py
            </Button>
          </div>
        )}
        {view.script ? (
          <CodeBlock code={view.script} maxHeight="32rem" />
        ) : (
          view.steps.filter((s) => s.code).map((s) => (
            <div key={s.id}>
              <p className="mb-1 text-sm font-medium">{s.title}</p>
              <CodeBlock code={s.code ?? ""} />
            </div>
          ))
        )}
      </TabsContent>

      {view.config.videos && (
        <TabsContent value="lectures">
          <Lectures view={view} />
        </TabsContent>
      )}
    </Tabs>
  );
}

const LECTURE_REASON: Record<string, string> = {
  no_key: "Video search isn't set up on this server yet (no YouTube API key).",
  key_invalid: "The server's YouTube API key was rejected.",
  api_disabled: "YouTube Data API v3 isn't enabled for the server's key.",
  quota: "Today's YouTube search quota is used up. It resets daily.",
  key_restricted: "The server's YouTube key is restricted and can't be used from the server.",
  forbidden: "YouTube refused the request from the server.",
  empty: "YouTube returned no matching videos.",
  network: "The server couldn't reach YouTube just now.",
  error: "YouTube returned an error.",
};

const LANG_KEY = "automl.lectureLang";
const LANGUAGES = [
  ["en", "English"], ["hi", "Hindi"], ["ta", "Tamil"], ["te", "Telugu"], ["kn", "Kannada"], ["ml", "Malayalam"], ["bn", "Bengali"], ["mr", "Marathi"],
  ["gu", "Gujarati"], ["pa", "Punjabi"], ["ur", "Urdu"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["pt", "Portuguese"], ["ar", "Arabic"], ["zh", "Chinese"], ["ja", "Japanese"],
] as const;

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

function Thumb({ id, className }: { id: string; className?: string }) {
  const [ok, setOk] = useState(true);
  return ok ? <img src={thumb(id)} alt="" loading="lazy" className={cn("size-full object-cover", className)} onError={() => setOk(false)} /> : <div className="size-full bg-muted" />;
}

/** Main video plays inside the page; the other videos are thumbnail cards on the right and swap into the player when clicked. */
function LectureBlock({ l, isAdmin }: { l: Lecture; isAdmin: boolean }) {
  const [order, setOrder] = useState(() => l.videos.map((v) => v.id));
  const [playing, setPlaying] = useState(false);
  const byId = Object.fromEntries(l.videos.map((v) => [v.id, v]));
  const main = byId[order[0]];
  const others = order.slice(1).map((id) => byId[id]);
  if (!main)
    return (
      <p className="text-sm text-muted-foreground">
        No video could be loaded for {l.name}. {LECTURE_REASON[l.reason ?? l.status ?? ""] ?? ""}
        {isAdmin && l.detail ? ` (${l.detail})` : ""}
      </p>
    );
  const pick = (id: string) => {
    setOrder((o) => [id, ...o.filter((x) => x !== id)]);
    setPlaying(true);
  };
  return (
    <div className="space-y-2">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <figure className="space-y-2">
          <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted shadow-sm">
            {playing ? (
              <iframe
                key={main.id}
                className="absolute inset-0 size-full"
                src={`https://www.youtube-nocookie.com/embed/${main.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={main.title || `${l.name} lecture`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 grid size-full place-items-center" aria-label={`Play: ${main.title || l.name}`}>
                <Thumb id={main.id} className="absolute inset-0" />
                <span className="absolute inset-0 bg-background/30 transition-colors group-hover:bg-background/10" />
                <span className="relative grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
                  <Play className="ml-0.5 size-6 fill-current" />
                </span>
              </button>
            )}
          </div>
          <figcaption className="text-sm">
            <span className="line-clamp-2 font-medium">{main.title || `${l.name} lecture`}</span>
            <span className="text-xs text-muted-foreground">{main.channel}</span>
          </figcaption>
        </figure>
        {others.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Similar videos</p>
            {others.map((v) => (
              <button key={v.id} type="button" onClick={() => pick(v.id)} className="flex w-full gap-3 rounded-lg border bg-card p-2 text-left transition-colors hover:border-primary/50 hover:bg-accent/40">
                <span className="relative block aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Thumb id={v.id} />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid size-7 place-items-center rounded-full bg-primary/90 text-primary-foreground">
                      <Play className="ml-px size-3.5 fill-current" />
                    </span>
                  </span>
                </span>
                <span className="min-w-0 flex-1 self-center">
                  <span className="line-clamp-2 text-[13px] font-medium">{v.title || `${l.name} lecture`}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{v.channel}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {l.note && <p className="text-xs text-muted-foreground">{l.note}</p>}
      {!l.note && l.reason && <p className="text-xs text-muted-foreground">Showing hand-picked videos. {LECTURE_REASON[l.reason] ?? ""}{isAdmin && l.detail ? ` (${l.detail})` : ""}</p>}
    </div>
  );
}

function Lectures({ view }: { view: JobView }) {
  const { me } = useMe();
  const [lang, setLang] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LANG_KEY);
    } catch {
      return null;
    }
  });
  const [data, setData] = useState<LectureSet | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const locked = view.locks.videos_locked;
  const paged = usePaged(data?.lectures ?? [], 3);

  useEffect(() => {
    if (!lang || locked) return;
    let alive = true;
    setData(null);
    setErr(null);
    api
      .get<LectureSet>(`/api/jobs/${view.id}/lectures?lang=${lang}`)
      .then((r) => alive && setData(r))
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [lang, locked, view.id]);

  const choose = (code: string) => {
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      /* ignore */
    }
    setLang(code);
  };

  if (locked) return <p className="text-sm text-muted-foreground">Video lectures unlock together with your results after payment.</p>;

  if (!lang)
    return (
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <p className="font-serif text-[16px] font-medium">Which language should the lecture videos be in?</p>
        <p className="text-[13px] text-muted-foreground">I'll find the best video for each model in that language, plus two similar ones.</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(([c, n]) => (
            <Button key={c} size="sm" variant="outline" onClick={() => choose(c)}>
              {n}
            </Button>
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Language</span>
        <Select value={lang} onChange={(e) => choose(e.target.value)} className="w-40" aria-label="Lecture language">
          {LANGUAGES.map(([c, n]) => (
            <option key={c} value={c}>
              {n}
            </option>
          ))}
        </Select>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {!data && !err && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Finding videos…
        </p>
      )}
      {paged.slice.map((l) => (
        <div key={`${l.model_id}-${data?.lang}`} className="rounded-xl border bg-card p-4">
          <p className="mb-3 font-serif text-[15px] font-medium">{l.name}</p>
          <LectureBlock l={l} isAdmin={!!me?.is_admin} />
        </div>
      ))}
      <Pager {...paged} />
    </div>
  );
}
