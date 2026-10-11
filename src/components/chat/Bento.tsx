import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 12-column bento grid: single column on phones, tiles span columns from `lg` up. */
export function Bento({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-3 lg:grid-cols-12", className)}>{children}</div>;
}

const SPAN: Record<number, string> = {
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  12: "lg:col-span-12",
};

export function Cell({ span = 6, children, className }: { span?: 3 | 4 | 5 | 6 | 7 | 8 | 12; children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0", SPAN[span], className)}>{children}</div>;
}

export function Tile({ label, value, sub, className, accent }: { label: string; value: ReactNode; sub?: ReactNode; className?: string; accent?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col justify-between rounded-xl border bg-card p-3.5", accent && "border-primary/30 bg-primary/5", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-serif text-xl leading-tight tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
