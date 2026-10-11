import { Monitor, Moon, Star, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getPrefs, setPrefs, type Prefs } from "@/lib/prefs";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { UsageMeter } from "./UsageMeter";

export function UsageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usage</DialogTitle>
          <DialogDescription>Free and paid model runs in your current window.</DialogDescription>
        </DialogHeader>
        <UsageMeter />
      </DialogContent>
    </Dialog>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground",
            value === o.v && "bg-card text-foreground shadow-sm",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { theme, setTheme } = useTheme();
  const [prefs, setLocal] = useState<Prefs>(getPrefs());
  const update = (p: Partial<Prefs>) => {
    const next = { ...prefs, ...p };
    setLocal(next);
    setPrefs(next);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Saved on this device.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div>
              <Segmented<ThemeChoice>
                value={theme}
                onChange={setTheme}
                options={[
                  { v: "system", label: "System", icon: <Monitor className="size-3.5" /> },
                  { v: "light", label: "Light", icon: <Sun className="size-3.5" /> },
                  { v: "dark", label: "Dark", icon: <Moon className="size-3.5" /> },
                ]}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Default scaling</Label>
            <div>
              <Segmented<Prefs["scale"]>
                value={prefs.scale}
                onChange={(scale) => update({ scale })}
                options={[
                  { v: "standard", label: "Standard" },
                  { v: "minmax", label: "Min-max" },
                  { v: "robust", label: "Robust" },
                  { v: "none", label: "None" },
                ]}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Default split</Label>
            <div>
              <Segmented<Prefs["split"]>
                value={prefs.split}
                onChange={(split) => update({ split })}
                options={[
                  { v: "random", label: "Random" },
                  { v: "chronological", label: "Chronological" },
                ]}
              />
            </div>
          </div>
          <p className="rounded-md bg-muted px-3 py-2 text-[13px] text-muted-foreground">
            Privacy: datasets are processed in memory and discarded when a run ends. Only your profile, payments, feedback and run
            summaries are stored.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackDialog({ open, onOpenChange, jobId }: { open: boolean; onOpenChange: (o: boolean) => void; jobId?: string }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    setState("sending");
    setErr(null);
    try {
      await api.post("/api/feedback", { rating, text, job_id: jobId ?? null });
      setState("sent");
    } catch (e) {
      setErr((e as Error).message);
      setState("idle");
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTimeout(() => setState("idle"), 300);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Give feedback</DialogTitle>
          <DialogDescription>Tell us what worked and what didn't.</DialogDescription>
        </DialogHeader>
        {state === "sent" ? (
          <p className="py-6 text-center text-sm">Thank you. Your feedback was sent.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)}>
                  <Star className={cn("size-7", n <= rating ? "fill-[var(--series-4)] text-[var(--series-4)]" : "text-muted-foreground/50")} />
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Optional comments"
              className="w-full rounded-md border bg-card p-3 text-sm"
            />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button disabled={rating === 0 || state === "sending"} onClick={send}>
              Send feedback
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
