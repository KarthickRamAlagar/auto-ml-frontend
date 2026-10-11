import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";

export function AssistantMsg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex animate-fade-in gap-3", className)}>
      <LogoMark className="mt-0.5 size-6 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">{children}</div>
    </div>
  );
}

export function UserMsg({ children }: { children: ReactNode }) {
  return (
    <div className="flex animate-fade-in justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-[15px]">{children}</div>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="prose-chat text-[15px] leading-relaxed">{children}</div>;
}
