import { Database, ExternalLink, Link2, Search, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pager, usePaged } from "@/components/ui/pager";
import { Spinner } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { DatasetCardInfo, DatasetSession, DatasetSource, SuggestResult, Task } from "@/lib/types";
import { fmtInt } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = { builtin: "Built-in", kaggle: "Kaggle", huggingface: "Hugging Face", uci: "UCI" };
const TABS: { id: DatasetSource | "own"; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "kaggle", label: "Kaggle" },
  { id: "huggingface", label: "Hugging Face" },
  { id: "uci", label: "UCI" },
  { id: "own", label: "Upload / link" },
];

interface TabState {
  items: DatasetCardInfo[];
  warnings: string[];
  rule?: { min_rows: number; min_cols: number };
  loading: boolean;
  loaded: boolean;
}
const EMPTY: TabState = { items: [], warnings: [], loading: false, loaded: false };

export function DatasetCards({
  domain,
  task,
  onPick,
  initialSource = "recommended",
}: {
  domain: string;
  task: Task;
  onPick: (s: DatasetSession) => void;
  initialSource?: DatasetSource | "own";
}) {
  const [tab, setTab] = useState<DatasetSource | "own">(initialSource);
  const [state, setState] = useState<Record<string, TabState>>({});
  const [small, setSmall] = useState(false);
  const [q, setQ] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (source: DatasetSource, query: string, includeSmall: boolean) => {
      setState((s) => ({ ...s, [source]: { ...(s[source] ?? EMPTY), loading: true } }));
      try {
        const r = await api.get<SuggestResult>(
          `/api/datasets/suggest?domain=${encodeURIComponent(domain)}&task=${task}&source=${source}&q=${encodeURIComponent(query)}&include_small=${includeSmall}`,
        );
        setState((s) => ({ ...s, [source]: { items: r.items, warnings: r.warnings, rule: r.rule, loading: false, loaded: true } }));
        // the UCI catalogue builds in the background after a server restart: look again shortly instead of showing a dead end
        if (r.warnings.some((w) => w.includes("still loading"))) setTimeout(() => void load(source, query, includeSmall), 8000);
      } catch (e) {
        setState((s) => ({ ...s, [source]: { items: [], warnings: [(e as Error).message], loading: false, loaded: true } }));
      }
    },
    [domain, task],
  );

  // each source loads the first time its tab opens, so a slow Kaggle never delays the recommended list
  useEffect(() => {
    if (tab !== "own" && !state[tab]?.loaded && !state[tab]?.loading) void load(tab, q[tab] ?? "", small);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, load]);

  const run = async (key: string, fn: () => Promise<DatasetSession>) => {
    setBusy(key);
    setErr(null);
    try {
      onPick(await fn());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as DatasetSource | "own")}>
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.filter((t) => t.id !== "own").map((t) => {
          const id = t.id as DatasetSource;
          return (
            <TabsContent key={id} value={id} className="space-y-3">
              <SourcePanel
                source={id}
                label={t.label}
                st={state[id] ?? EMPTY}
                domain={domain}
                q={q[id] ?? ""}
                setQ={(v) => setQ((o) => ({ ...o, [id]: v }))}
                onSearch={() => void load(id, q[id] ?? "", small)}
                small={small}
                setSmall={(v) => {
                  setSmall(v);
                  void load("recommended", "", v);
                }}
                busy={busy}
                onUse={(d) => run(d.id, () => api.post<DatasetSession>("/api/datasets/select", { id: d.id }))}
              />
            </TabsContent>
          );
        })}
        <TabsContent value="own">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-1 font-serif text-[15px] font-medium">Bring your own data</p>
            <p className="mb-3 text-[13px] text-muted-foreground">Your own files can be any size up to 25 MB; the 50,000-row rule applies only to search results.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void run("upload", () => api.upload<DatasetSession>("/api/datasets/upload", f));
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" className="w-full" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
                  {busy === "upload" ? <Spinner /> : <Upload />} Upload a CSV (max 25 MB)
                </Button>
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (link.trim()) void run("link", () => api.post<DatasetSession>("/api/datasets/from-url", { url: link.trim() }));
                }}
              >
                <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a CSV link (Drive, GitHub raw, UCI…)" aria-label="CSV link" />
                <Button type="submit" variant="outline" disabled={busy !== null || !link.trim()}>
                  {busy === "link" ? <Spinner /> : <Link2 />} Load
                </Button>
              </form>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Colab links work only if they point to a CSV file. Your data is used in memory and discarded when the run ends.</p>
          </div>
        </TabsContent>
      </Tabs>
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}

function SourcePanel({
  source,
  label,
  st,
  domain,
  q,
  setQ,
  onSearch,
  small,
  setSmall,
  busy,
  onUse,
}: {
  source: DatasetSource;
  label: string;
  st: TabState;
  domain: string;
  q: string;
  setQ: (v: string) => void;
  onSearch: () => void;
  small: boolean;
  setSmall: (v: boolean) => void;
  busy: string | null;
  onUse: (d: DatasetCardInfo) => void;
}) {
  const paged = usePaged(st.items, 6);
  const rule = st.rule;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {rule && (
          <p className="text-xs text-muted-foreground">
            Showing datasets with at least <b>{fmtInt(rule.min_rows)}</b> rows and <b>{rule.min_cols}</b> columns.
          </p>
        )}
        {source === "recommended" && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={small} onChange={(e) => setSmall(e.target.checked)} /> Also show small practice datasets
          </label>
        )}
      </div>
      {source !== "recommended" && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label} (leave empty to search ${domain.toLowerCase()} topics)`} aria-label={`Search ${label}`} />
          <Button type="submit" variant="outline" disabled={st.loading}>
            <Search /> Search
          </Button>
        </form>
      )}
      {st.loading && (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Spinner /> {source === "uci" ? "Reading the UCI catalogue (the first time after a restart takes about 20 seconds)…" : source === "kaggle" ? "Searching Kaggle (a new search can take 10 to 20 seconds)…" : `Searching ${label}…`}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {paged.slice.map((d) => (
          <div key={d.id} className="flex flex-col rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="muted">{SOURCE_LABEL[d.source] ?? d.source}</Badge>
              {d.synthetic && <Badge variant="outline">Synthetic</Badge>}
              {d.match && d.source === "builtin" && <Badge>Matches {domain}</Badge>}
            </div>
            <h4 className="font-serif text-[15px] font-medium leading-snug">{d.name}</h4>
            <p className="mt-1 line-clamp-3 flex-1 text-[13px] text-muted-foreground">{d.description || "No description."}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Rows</dt>
                <dd className="font-medium tabular-nums">{d.rows != null ? fmtInt(d.rows) : <span className="font-normal text-muted-foreground" title="Kaggle does not publish row and column counts. They are verified when you load the dataset.">verified on load</span>}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Columns</dt>
                <dd className="font-medium tabular-nums">{d.cols != null ? d.cols : <span className="font-normal text-muted-foreground" title="Kaggle does not publish row and column counts. They are verified when you load the dataset.">verified on load</span>}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Size</dt>
                <dd className="font-medium tabular-nums">{d.size_mb != null ? `${d.size_mb} MB` : "–"}</dd>
              </div>
            </dl>
            <p className="mt-2 truncate text-[11px] text-muted-foreground" title={d.license}>
              Licence: {d.license}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" disabled={busy !== null} onClick={() => onUse(d)}>
                {busy === d.id ? <Spinner /> : <Database />} Use this dataset
              </Button>
              {d.url && (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label={`Open ${d.name} source page`}>
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      <Pager {...paged} />
      {st.loaded && !st.loading && st.items.length === 0 && st.warnings.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing to show here for this task and domain.</p>
      )}
      {st.warnings.map((w) => (
        <p key={w} className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          {w}
        </p>
      ))}
    </div>
  );
}
