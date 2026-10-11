import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string; auto_select?: boolean }) => void;
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let gsi: Promise<void> | null = null;
const loadGsi = () =>
  (gsi ??= new Promise<void>((res, rej) => {
    if (window.google) return res();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("Could not load Google sign-in."));
    document.head.appendChild(s);
  }));

/** Google's own button (Identity Services). The ID token goes to our Worker, which verifies it; nothing is trusted client-side. */
export function GoogleButton({ onError, text = "continue_with" }: { onError: (m: string) => void; text?: "signin_with" | "signup_with" | "continue_with" }) {
  const { signInGoogle } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "off">("loading");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const cfg = await api.get<{ google_client_id: string | null }>("/api/auth/config");
        if (!cfg.google_client_id) return !dead && setState("off");
        await loadGsi();
        if (dead || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: cfg.google_client_id,
          callback: (r) => signInGoogle(r.credential).catch((e: Error) => onError(e.message)),
        });
        window.google.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          width: Math.min(ref.current.clientWidth || 320, 400),
        });
        setState("ready");
      } catch (e) {
        if (!dead) {
          setState("off");
          onError((e as Error).message);
        }
      }
    })();
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "off") return null;
  return (
    <>
      <div ref={ref} className="flex min-h-10 w-full justify-center" aria-busy={state === "loading"} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
