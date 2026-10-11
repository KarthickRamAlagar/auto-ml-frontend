import { Folder, FolderMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Chat, Group } from "@/lib/types";

export function TextPromptDialog({
  open,
  onOpenChange,
  title,
  description,
  initial = "",
  cta,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  initial?: string;
  cta: string;
  onSubmit: (v: string) => Promise<void> | void;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setV(initial);
      setErr(null);
    }
  }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!v.trim()) return;
            setBusy(true);
            try {
              await onSubmit(v.trim());
              onOpenChange(false);
            } catch (x) {
              setErr((x as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input autoFocus value={v} maxLength={80} onChange={(e) => setV(e.target.value)} aria-label={title} />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !v.trim()}>
              {cta}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MoveDialog({
  chat,
  groups,
  onClose,
  onMove,
  onCreate,
}: {
  chat: Chat | null;
  groups: Group[];
  onClose: () => void;
  onMove: (groupId: string | null) => Promise<void>;
  onCreate: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const go = async (id: string | null) => {
    setBusy(true);
    try {
      await onMove(id);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!chat} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to project</DialogTitle>
          <DialogDescription className="truncate">{chat?.title}</DialogDescription>
        </DialogHeader>
        <div className="scroll-thin max-h-64 space-y-1 overflow-y-auto">
          {groups.length === 0 && <p className="text-sm text-muted-foreground">You have no projects yet.</p>}
          {groups.map((g) => (
            <button
              key={g.id}
              disabled={busy || chat?.group_id === g.id}
              onClick={() => go(g.id)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
            >
              <Folder className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{g.name}</span>
              {chat?.group_id === g.id && <span className="text-xs text-muted-foreground">current</span>}
            </button>
          ))}
          {chat?.group_id && (
            <button disabled={busy} onClick={() => go(null)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent">
              <FolderMinus className="size-4 text-muted-foreground" /> Remove from project
            </button>
          )}
        </div>
        <Button variant="outline" onClick={onCreate}>
          New project…
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  cta,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  body: string;
  cta: string;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {cta}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
