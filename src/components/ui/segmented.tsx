import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegOption<T extends string> {
  v: T;
  label: string;
  disabled?: boolean;
  badge?: ReactNode;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1", className)} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          disabled={o.disabled}
          onClick={() => onChange(o.v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors disabled:opacity-40",
            value === o.v ? "bg-card text-foreground shadow-sm" : "hover:text-foreground",
          )}
        >
          {o.label}
          {o.badge}
        </button>
      ))}
    </div>
  );
}
