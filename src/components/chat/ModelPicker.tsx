import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me";
import { Input } from "@/components/ui/input";
import type { ModelInfo, ParsedModels, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ModelPicker({
  task,
  domain,
  done,
  onSubmit,
  onLoaded,
}: {
  task: Task;
  domain: string;
  done?: boolean;
  onSubmit: (ids: string[], summary: string) => void;
  onLoaded: (models: ModelInfo[]) => void;
}) {
  const { usage } = useMe();
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [typedNote, setTypedNote] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    api
      .get<{ models: ModelInfo[] }>(`/api/models?task=${task}&domain=${encodeURIComponent(domain)}`)
      .then((r) => {
        setModels(r.models);
        onLoaded(r.models);
        setPicked(r.models.slice(0, 3).map((m) => m.id));
      })
      .catch((e: Error) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, domain]);

  if (done) return null;
  if (err) return <p className="text-sm text-destructive">{err}</p>;
  if (!models) return <Spinner />;

  const room = usage?.unlimited ? 99 : usage?.total_remaining ?? 25;
  const free = usage?.unlimited ? 99 : usage?.free_remaining ?? 10;
  const top = (n: number) => setPicked(models.slice(0, Math.min(n, room)).map((m) => m.id));
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= room ? p : [...p, id]));

  const parse = async () => {
    if (typed.trim().length < 2) return;
    setParsing(true);
    setTypedNote(null);
    try {
      const r = await api.post<ParsedModels>("/api/models/parse", { text: typed.trim(), task });
      const ids = r.model_ids.filter((id) => models.some((m) => m.id === id)).slice(0, room);
      if (ids.length) setPicked(ids);
      const nameOf = (id: string) => models.find((m) => m.id === id)?.name ?? id;
      const parts = [ids.length ? `Selected: ${ids.map(nameOf).join(", ")}.` : "I couldn't match any model names."];
      if (r.not_for_task.length) parts.push(`Not available for ${task}: ${r.not_for_task.join(", ")}.`);
      if (r.not_offered.length) parts.push(`Not offered yet: ${r.not_offered.join(", ")}.`);
      setTypedNote(parts.join(" "));
    } catch (e) {
      setTypedNote((e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="font-serif text-[16px] font-medium">Which algorithms should I run?</p>
      <p className="mb-3 text-[13px] text-muted-foreground">
        Suggested for {domain.toLowerCase()} {task}. {usage?.unlimited ? "You have unlimited access." : `You can run ${room} more model(s) in this window (${free} free).`}
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => top(3)}>
          Top 3
        </Button>
        <Button size="sm" variant="outline" onClick={() => top(5)}>
          Top 5
        </Button>
        <Button size="sm" variant="outline" onClick={() => top(models.length)}>
          All {models.length}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPicked([])}>
          Clear
        </Button>
      </div>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void parse();
        }}
      >
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type the models you want, e.g. random forest, decision tree and a neural network" aria-label="Type the models you want" maxLength={300} />
        <Button type="submit" variant="outline" disabled={parsing || typed.trim().length < 2}>
          {parsing ? <Spinner /> : "Select"}
        </Button>
      </form>
      {typedNote && <p className="mb-3 text-xs text-muted-foreground">{typedNote}</p>}
      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Algorithms">
        {models.map((m) => {
          const on = picked.includes(m.id);
          const disabled = !on && picked.length >= room;
          return (
            <button
              key={m.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={disabled}
              onClick={() => toggle(m.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/50 disabled:opacity-40",
                on && "border-primary bg-primary/5",
              )}
            >
              <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                {on && <Check className="size-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  {m.name}
                  {m.recommended && <Badge>Recommended</Badge>}
                  {m.slow && <Badge variant="muted">slower</Badge>}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">{m.recommended && m.why ? m.why : m.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{picked.length} selected</span>
        <Button
          disabled={picked.length === 0}
          onClick={() => onSubmit(picked, picked.map((id) => models.find((m) => m.id === id)?.name ?? id).join(", "))}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
