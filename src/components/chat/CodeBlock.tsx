import { Check, Copy } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { copyText, cn } from "@/lib/utils";

const TOKEN =
  /(#[^\n]*)|("""[\s\S]*?"""|'[^'\n]*'|"[^"\n]*")|\b(import|from|as|def|return|for|in|if|else|elif|with|None|True|False|class|and|or|not|lambda|try|except)\b|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)/g;

/** Tiny dependency-free Python highlighter (comments, strings, keywords, numbers). */
export function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of code.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(code.slice(last, at));
    const cls = m[1] ? "text-muted-foreground italic" : m[2] ? "text-success" : m[3] ? "text-primary" : "text-warning";
    out.push(
      <span key={i++} className={cls}>
        {m[0]}
      </span>,
    );
    last = at + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function CodeBlock({ code, className, maxHeight = "18rem" }: { code: string; className?: string; maxHeight?: string }) {
  const [copied, setCopied] = useState(false);
  const nodes = useMemo(() => highlight(code), [code]);
  return (
    <div className={cn("group relative rounded-lg border bg-[var(--code-bg,hsl(var(--muted)))]", className)}>
      <button
        type="button"
        onClick={async () => {
          if (await copyText(code)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className="no-print absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground opacity-80 hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="scroll-thin overflow-auto p-3 pr-20 font-mono text-[12.5px] leading-relaxed" style={{ maxHeight }}>
        <code>{nodes}</code>
      </pre>
    </div>
  );
}
