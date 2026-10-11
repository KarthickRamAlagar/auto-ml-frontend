import { Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface Opt {
  value: string;
  label: string;
  hint?: string;
  recommended?: boolean;
}

/** A Claude-style question: a few options, one marked Recommended with a reason, and an "Other" escape hatch. */
export function AskCard({
  question,
  options,
  multi,
  allowOther,
  otherPlaceholder = "Type your own answer",
  answered,
  onAnswer,
  onChange,
}: {
  question: string;
  options: Opt[];
  multi?: boolean;
  allowOther?: boolean;
  otherPlaceholder?: string;
  answered?: string;
  onAnswer: (values: string[], display: string) => void;
  /** When given, the answered row shows a Change button that takes the chat back to this question. */
  onChange?: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const locked = answered !== undefined;

  const toggle = (v: string) => {
    if (locked) return;
    if (!multi) {
      const o = options.find((x) => x.value === v);
      onAnswer([v], o?.label ?? v);
      return;
    }
    setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  };

  if (locked) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
        <Check className="size-4 text-success" />
        <span>{question}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{answered}</span>
        {onChange && (
          <button type="button" onClick={onChange} className="rounded px-1.5 py-0.5 text-xs text-primary hover:bg-primary/10">
            Change
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="mb-3 font-serif text-[16px] font-medium">{question}</p>
      <div className="space-y-2" role={multi ? "group" : "radiogroup"} aria-label={question}>
        {options.map((o, i) => {
          const on = picked.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={multi ? on : false}
              onClick={() => toggle(o.value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-accent/60",
                on && "border-primary bg-primary/5",
              )}
            >
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-muted text-[11px] text-muted-foreground">
                {on ? <Check className="size-3.5 text-primary" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {o.label}
                  {o.recommended && <Badge>Recommended</Badge>}
                </span>
                {o.hint && <span className="mt-0.5 block text-[13px] text-muted-foreground">{o.hint}</span>}
              </span>
            </button>
          );
        })}
        {allowOther && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = other.trim();
              if (v) onAnswer([v], v);
            }}
          >
            <Input value={other} onChange={(e) => setOther(e.target.value)} placeholder={otherPlaceholder} maxLength={40} aria-label="Other" />
            <Button type="submit" variant="outline" disabled={!other.trim()}>
              Use
            </Button>
          </form>
        )}
      </div>
      {multi && (
        <div className="mt-3 flex justify-end">
          <Button
            disabled={picked.length === 0}
            onClick={() => onAnswer(picked, picked.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", "))}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
