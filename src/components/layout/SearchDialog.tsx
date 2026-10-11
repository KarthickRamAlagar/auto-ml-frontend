import { Brain, FolderClock, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { Chat, ModelInfo } from "@/lib/types";

export function SearchDialog({
  open,
  onOpenChange,
  chats,
  onOpenChat,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  chats: Chat[];
  onOpenChat: (c: Chat) => void;
}) {
  const [q, setQ] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open || models.length) return;
    void Promise.all([
      api.get<{ models: ModelInfo[] }>("/api/models?task=classification"),
      api.get<{ models: ModelInfo[] }>("/api/models?task=regression"),
    ])
      .then(([a, b]) => {
        const seen = new Set<string>();
        setModels([...a.models, ...b.models].filter((m) => (seen.has(m.id) ? false : seen.add(m.id))));
      })
      .catch(() => undefined);
  }, [open, models.length]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setExpanded(null);
    }
  }, [open]);

  const needle = q.trim().toLowerCase();
  const works = useMemo(
    () => chats.filter((p) => !needle || `${p.title} ${p.domain} ${p.task} ${p.winner?.name ?? ""}`.toLowerCase().includes(needle)).slice(0, 8),
    [chats, needle],
  );
  const algos = useMemo(
    () => models.filter((m) => !needle || `${m.name} ${m.blurb}`.toLowerCase().includes(needle)).slice(0, 8),
    [models, needle],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 p-0" hideClose>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">Search your works and algorithms</DialogDescription>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your works and algorithms…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="scroll-thin max-h-[55vh] overflow-y-auto p-2">
          <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">Your works</p>
          {works.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">No matching works yet.</p>}
          {works.map((p) => (
            <button
              key={p.id}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent"
              onClick={() => {
                onOpenChat(p);
                onOpenChange(false);
              }}
            >
              <FolderClock className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{p.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {p.domain} · {p.task}
                  {p.winner ? ` · best: ${p.winner.name}` : ""}
                </span>
              </span>
            </button>
          ))}
          <p className="px-2 pb-1 pt-3 text-xs font-medium text-muted-foreground">Algorithms</p>
          {algos.map((m) => (
            <div key={m.id}>
              <button
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent"
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                aria-expanded={expanded === m.id}
              >
                <Brain className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 text-sm">{m.name}</span>
                {m.slow && <Badge variant="muted">slower</Badge>}
              </button>
              {expanded === m.id && (
                <div className="mx-2 mb-2 rounded-md bg-muted px-3 py-2 text-[13px]">
                  <p>{m.blurb}</p>
                  {m.params.length > 0 && (
                    <p className="mt-1 text-muted-foreground">Tunable: {m.params.map((p) => p.label).join(", ")}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
