import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

/** Shared frame for the account pages: same card, serif heading and quiet footer as the rest of Auto ML. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <Link to="/" aria-label="Auto ML home">
            <Logo size="lg" className="justify-center" />
          </Link>
          <h1 className="mt-5 font-serif text-xl font-medium">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
        <p className="text-center text-xs text-muted-foreground">We store only your account details, usage and payments. Datasets are never saved.</p>
      </div>
    </div>
  );
}
