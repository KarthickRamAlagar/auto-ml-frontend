import { FolderMinus, Folder, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ResultsTabs } from "@/components/chat/ResultsTabs";
import { AppShell } from "@/components/layout/AppShell";
import { ConfirmDialog, MoveDialog, TextPromptDialog } from "@/components/layout/SidebarDialogs";
import { Button } from "@/components/ui/button";
import { Pager, usePaged } from "@/components/ui/pager";
import { Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useChats } from "@/lib/chats";
import { chatPath, newChatPath } from "@/lib/ids";
import { useSeo } from "@/lib/seo";
import type { Chat, JobView } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ProjectPage() {
  useSeo({ title: "Project · Auto ML", noindex: true });
  const { projectId = "" } = useParams();
  const nav = useNavigate();
  const { chats, groups, loading, renameGroup, deleteGroup, moveChat, deleteChat, createGroup } = useChats();
  const group = groups.find((g) => g.id === projectId);
  const mine = useMemo(() => chats.filter((c) => c.group_id === projectId && !c.parent_id), [chats, projectId]);
  const paged = usePaged(mine, 6);
  const [selId, setSelId] = useState<string | null>(null);
  const [view, setView] = useState<JobView | null>(null);
  const [viewErr, setViewErr] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [delProject, setDelProject] = useState(false);
  const [delChat, setDelChat] = useState<Chat | null>(null);
  const [moving, setMoving] = useState<Chat | null>(null);
  const [adding, setAdding] = useState(false);
  const [newProject, setNewProject] = useState<Chat | null>(null);

  const selected = mine.find((c) => c.id === selId) ?? mine[0] ?? null;
  const selJob = selected?.job_id;

  useEffect(() => {
    if (!selJob) {
      setView(null);
      return;
    }
    let alive = true;
    setView(null);
    setViewErr(null);
    api
      .get<JobView>(`/api/jobs/${selJob}`)
      .then((v) => alive && setView(v))
      .catch((e: Error) => alive && setViewErr(e.message));
    return () => {
      alive = false;
    };
  }, [selJob]);

  const loose = useMemo(() => chats.filter((c) => !c.group_id && !c.parent_id), [chats]);

  if (!group) {
    return (
      <AppShell title="Project">
        <div className="grid h-full place-items-center p-6 text-center">
          {loading ? (
            <Spinner />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">This project doesn't exist or was deleted.</p>
              <Button onClick={() => nav(newChatPath())}>Start a new chat</Button>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={group.name}>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
          <div className="flex flex-wrap items-start gap-3">
            <Folder className="mt-1 size-6 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-serif text-2xl">{group.name}</h2>
              <p className="text-sm text-muted-foreground">
                {mine.length} chat{mine.length === 1 ? "" : "s"}
                {group.domain ? ` · ${group.domain}` : ""}
                {group.task ? ` · ${group.task}` : ""}. Results, EDA and code stay saved. Datasets are never stored, so runs can't be repeated.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => nav(newChatPath(group.id))}>
                <Plus /> New chat in this project
              </Button>
              <Button variant="outline" disabled={loose.length === 0} onClick={() => setAdding(true)}>
                Add existing chat
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setRenaming(true)} aria-label="Rename project">
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDelProject(true)} aria-label="Delete project">
                <Trash2 />
              </Button>
            </div>
          </div>

          {mine.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No chats yet. Start a new chat in this project, or add an existing one.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
              <aside className="space-y-2" aria-label="Chats in this project">
                {paged.slice.map((c) => (
                  <div key={c.id} className={cn("group rounded-xl border bg-card p-3", selected?.id === c.id && "border-primary ring-1 ring-primary/40")}>
                    <button className="block w-full text-left" onClick={() => setSelId(c.id)}>
                      <span className="block truncate text-sm font-medium">{c.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.dataset} · {c.task}
                      </span>
                      {c.winner && <span className="mt-1 block truncate text-xs">Best: {c.winner.name}</span>}
                    </button>
                    <div className="mt-2 flex gap-1">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={chatPath(c.id)}>
                          <MessageSquare /> Open
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void moveChat(c.id, null)} aria-label={`Remove ${c.title} from project`}>
                        <FolderMinus /> Remove
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setMoving(c)} aria-label={`Move ${c.title}`}>
                        <Folder />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDelChat(c)} aria-label={`Delete ${c.title}`}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
                <Pager {...paged} />
              </aside>

              <section className="min-w-0" aria-label="Saved results">
                {!view && !viewErr && (
                  <div className="grid place-items-center py-16">
                    <Spinner />
                  </div>
                )}
                {viewErr && <p className="text-sm text-destructive">{viewErr}</p>}
                {view && view.status === "done" && <ResultsTabs view={view} onReport={() => nav(`/report/${view.id}?download=1`)} />}
                {view && view.status !== "done" && <p className="text-sm text-muted-foreground">This run is {view.status}. Open the chat to follow it.</p>}
              </section>
            </div>
          )}
        </div>
      </div>

      <TextPromptDialog open={renaming} onOpenChange={setRenaming} title="Rename project" initial={group.name} cta="Save" onSubmit={(t) => renameGroup(group.id, t)} />
      <TextPromptDialog
        open={!!newProject}
        onOpenChange={(o) => !o && setNewProject(null)}
        title="New project"
        cta="Create"
        onSubmit={async (name) => {
          const g = await createGroup(name);
          if (newProject) await moveChat(newProject.id, g.id);
        }}
      />
      <ConfirmDialog
        open={delProject}
        onOpenChange={setDelProject}
        title="Delete this project?"
        body="The chats inside are kept and move back to Recent chats."
        cta="Delete project"
        onConfirm={async () => {
          await deleteGroup(group.id);
          nav(newChatPath());
        }}
      />
      <ConfirmDialog
        open={!!delChat}
        onOpenChange={(o) => !o && setDelChat(null)}
        title="Delete this chat?"
        body="Its saved results, EDA and code are removed for good."
        cta="Delete"
        onConfirm={async () => {
          await deleteChat(delChat!.id);
        }}
      />
      <MoveDialog
        chat={moving}
        groups={groups}
        onClose={() => setMoving(null)}
        onMove={(gid) => moveChat(moving!.id, gid)}
        onCreate={() => {
          setNewProject(moving);
          setMoving(null);
        }}
      />

      {adding && <AddChats loose={loose} onClose={() => setAdding(false)} onAdd={(ids) => Promise.all(ids.map((id) => moveChat(id, group.id))).then(() => setAdding(false))} />}
    </AppShell>
  );
}

function AddChats({ loose, onClose, onAdd }: { loose: Chat[]; onClose: () => void; onAdd: (ids: string[]) => Promise<void> }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const paged = usePaged(loose, 6);
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Add chats to project" onClick={onClose}>
      <div className="w-full max-w-md space-y-3 rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-serif text-lg">Add existing chats</h3>
        <ul className="space-y-1">
          {paged.slice.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                <span className="text-xs text-muted-foreground">{c.task}</span>
              </label>
            </li>
          ))}
        </ul>
        <Pager {...paged} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={picked.size === 0 || busy}
            onClick={() => {
              setBusy(true);
              void onAdd([...picked]).finally(() => setBusy(false));
            }}
          >
            Add {picked.size || ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
