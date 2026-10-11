import { cn } from "@/lib/utils";

/** Placeholder logo (to be replaced once the brand is final). Original mark: a rising signal inside a rounded square. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} role="img" aria-label="Auto ML">
      <rect width="32" height="32" rx="9" fill="hsl(var(--primary))" />
      <path d="M7 22 L13 15 L18 19 L25 9" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25" cy="9" r="2.4" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
}

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={size === "lg" ? "size-9" : size === "sm" ? "size-6" : "size-7"} />
      <span className={cn("font-serif font-medium tracking-tight", text)}>Auto ML</span>
    </span>
  );
}

/** Small pill shown after the logo: this app is a beta-stage sub-product of the Auto DISM platform. */
export function BetaChip({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary", className)}
      title="A sub-product of the Auto DISM Platform, in beta"
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      <span className="hidden sm:inline">Auto DISM ·</span> Beta
    </span>
  );
}
