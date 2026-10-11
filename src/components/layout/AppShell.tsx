import { ChevronRight, CornerDownRight, Folder, FolderPlus, Gauge, Menu, MessageSquare, Moon, MoreHorizontal, PanelLeftClose, Pencil, Plus, Search, Sun, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useMatch, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useChats } from "@/lib/chats";
import { chatPath, newChatPath, projectPath } from "@/lib/ids";
import { useMe } from "@/lib/me";
import { useTheme } from "@/lib/theme";
import type { Chat, Group } from "@/lib/types";
import { cn, fmtDuration } from "@/lib/utils";
import { InstallApp } from "./InstallApp";
import { UsageDialog } from "./Dialogs";
import { SearchDialog } from "./SearchDialog";
import { ConfirmDialog, MoveDialog, TextPromptDialog } from "./SidebarDialogs";
import { UserMenu } from "./UserMenu";

const CHATS_PAGE = 8;

export function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const nav = useNavigate();
  const chatMatch = useMatch("/auto-ml/chat/:chatId");
  const projMatch = useMatch("/auto-ml/project/:projectId");
  const activeChat = chatMatch?.params.chatId;
  const activeProject = projMatch?.params.projectId;
  const { chats, groups, createGroup, renameGroup, deleteGroup, renameChat, moveChat, deleteChat } = useChats();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [shown, setShown] = useState(CHATS_PAGE);
  const [newProject, setNewProject] = useState<{ thenMove?: Chat } | null>(null);
  const [renameChatT, setRenameChatT] = useState<Chat | null>(null);
  const [renameGroupT, setRenameGroupT] = useState<Group | null>(null);
  const [moving, setMoving] = useState<Chat | null>(null);
  const [delChat, setDelChat] = useState<Chat | null>(null);
  const [delGroup, setDelGroup] = useState<Group | null>(null);
  const { usage, now } = useMe();
  const { resolved, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const recent = useMemo(() => chats.filter((c) => !c.group_id && !c.parent_id), [chats]);
  const byId = useMemo(() => new Map(chats.map((c) => [c.id, c])), [chats]);
  const used = usage ? usage.free_used + usage.paid_used : 0;
  const cap = usage ? usage.free_limit + usage.paid_limit : 25;
  const left = usage?.resets_at ? usage.resets_at - now : null;
  const close = () => setOpen(false);

  return (
    <div className="flex h-dvh overflow-hidden">
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={close} aria-hidden />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-sidebar transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <Link to="/" aria-label="Auto ML home" className="rounded-md outline-offset-4" onClick={close}>
            <Logo />
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={close} aria-label="Close sidebar">
            <PanelLeftClose />
          </Button>
        </div>
        <div className="space-y-2 px-3 pb-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              nav(newChatPath());
              close();
            }}
          >
            <Plus /> New chat
          </Button>
          <button onClick={() => setSearch(true)} className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-muted-foreground hover:bg-accent">
            <Search className="size-4" />
            <span className="flex-1">Search your works</span>
            <kbd className="rounded border bg-card px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
        </div>

        <nav className="scroll-thin flex-1 space-y-4 overflow-y-auto px-3 py-2" aria-label="Chats and projects">
          <section aria-label="Projects">
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="text-xs font-medium text-muted-foreground">Projects</p>
              <button onClick={() => setNewProject({})} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="New project">
                <FolderPlus className="size-4" />
              </button>
            </div>
            {groups.length === 0 && <p className="px-2 py-1 text-[13px] text-muted-foreground">Group related chats into a project.</p>}
            {groups.map((g) => (
              <div key={g.id} className={cn("group flex items-center rounded-md hover:bg-accent", activeProject === g.id && "bg-accent")}>
                <Link to={projectPath(g.id)} onClick={close} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
                  <Folder className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">{g.name}</span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger className="mr-1 rounded p-1 text-muted-foreground opacity-0 hover:bg-card focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label={`Options for ${g.name}`}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-40">
                    <DropdownMenuItem onSelect={() => nav(newChatPath(g.id))}>
                      <Plus /> New chat here
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setRenameGroupT(g)}>
                      <Pencil /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setDelGroup(g)}>
                      <Trash2 /> Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </section>

          <section aria-label="Recent chats">
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Recent chats</p>
            {recent.length === 0 && <p className="px-2 py-1 text-[13px] text-muted-foreground">Your finished runs will appear here.</p>}
            {recent.slice(0, shown).map((c) => (
              <div key={c.id}>
              <div className={cn("group flex items-center rounded-md hover:bg-accent", activeChat === c.id && "bg-accent")}>
                <Link to={chatPath(c.id)} onClick={close} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{c.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.domain} · {c.kind === "main" ? "classification + regression" : c.task}
                    </span>
                  </span>
                </Link>
                <ChatMenu chat={c} onRename={() => setRenameChatT(c)} onMove={() => setMoving(c)} onDelete={() => setDelChat(c)} />
              </div>
              {c.kind === "main" &&
                (c.children ?? []).map((id) => byId.get(id)).filter((x): x is Chat => !!x).map((sub) => (
                  <Link key={sub.id} to={chatPath(sub.id)} onClick={close} className={cn("ml-6 flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent", activeChat === sub.id && "bg-accent text-foreground")}>
                    <CornerDownRight className="size-3.5 shrink-0" />
                    <span className="truncate capitalize">{sub.task}</span>
                    {sub.winner && <span className="truncate">· {sub.winner.name}</span>}
                  </Link>
                ))}
              </div>
            ))}
            {recent.length > shown && (
              <button onClick={() => setShown((n) => n + CHATS_PAGE)} className="mt-1 flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                <ChevronRight className="size-3.5" /> Show more ({recent.length - shown})
              </button>
            )}
          </section>
        </nav>
        <div className="space-y-1 border-t p-2">
          <InstallApp />
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open sidebar">
            <Menu />
          </Button>
          <h1 className="min-w-0 flex-1 truncate font-serif text-[15px] font-medium">{title ?? "New chat"}</h1>
          {usage && (
            <button
              onClick={() => setUsageOpen(true)}
              className="hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs hover:bg-accent sm:flex"
              aria-label="Usage"
            >
              <Gauge className="size-3.5 text-muted-foreground" />
              {usage.unlimited ? (
                "Unlimited"
              ) : (
                <>
                  <span className="tabular-nums">
                    {used}/{cap}
                  </span>
                  {left != null && left > 0 && <span className="text-muted-foreground">· resets in {fmtDuration(left)}</span>}
                </>
              )}
            </button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setTheme(resolved === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {resolved === "dark" ? <Sun /> : <Moon />}
          </Button>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>
      <SearchDialog open={search} onOpenChange={setSearch} chats={chats} onOpenChat={(c) => nav(chatPath(c.id))} />
      <UsageDialog open={usageOpen} onOpenChange={setUsageOpen} />

      <TextPromptDialog
        open={!!newProject}
        onOpenChange={(o) => !o && setNewProject(null)}
        title="New project"
        description="Group related chats together, such as all your experiments on one topic."
        cta="Create"
        onSubmit={async (name) => {
          const g = await createGroup(name);
          if (newProject?.thenMove) await moveChat(newProject.thenMove.id, g.id);
          else nav(projectPath(g.id));
        }}
      />
      <TextPromptDialog open={!!renameChatT} onOpenChange={(o) => !o && setRenameChatT(null)} title="Rename chat" initial={renameChatT?.title} cta="Save" onSubmit={(t) => renameChat(renameChatT!.id, t)} />
      <TextPromptDialog open={!!renameGroupT} onOpenChange={(o) => !o && setRenameGroupT(null)} title="Rename project" initial={renameGroupT?.name} cta="Save" onSubmit={(t) => renameGroup(renameGroupT!.id, t)} />
      <MoveDialog
        chat={moving}
        groups={groups}
        onClose={() => setMoving(null)}
        onMove={(gid) => moveChat(moving!.id, gid)}
        onCreate={() => {
          setNewProject({ thenMove: moving ?? undefined });
          setMoving(null);
        }}
      />
      <ConfirmDialog
        open={!!delChat}
        onOpenChange={(o) => !o && setDelChat(null)}
        title="Delete this chat?"
        body="Its saved results, EDA and code are removed for good."
        cta="Delete"
        onConfirm={async () => {
          const id = delChat!.id;
          await deleteChat(id);
          if (activeChat === id) nav(newChatPath());
        }}
      />
      <ConfirmDialog
        open={!!delGroup}
        onOpenChange={(o) => !o && setDelGroup(null)}
        title="Delete this project?"
        body="The chats inside are kept and move back to Recent chats."
        cta="Delete project"
        onConfirm={async () => {
          const id = delGroup!.id;
          await deleteGroup(id);
          if (activeProject === id) nav(newChatPath());
        }}
      />
    </div>
  );
}


export function ChatMenu({ chat, onRename, onMove, onDelete }: { chat: Chat; onRename: () => void; onMove: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="mr-1 rounded p-1 text-muted-foreground opacity-0 hover:bg-card focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label={`Options for ${chat.title}`}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuItem onSelect={onRename}>
          <Pencil /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onMove}>
          <Folder /> Move to project…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
