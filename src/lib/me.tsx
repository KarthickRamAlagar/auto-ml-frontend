import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Me, Usage } from "./types";

interface MeCtx {
  me: Me | null;
  usage: Usage | null;
  /** seconds since epoch, ticking every second (server-clock aligned) */
  now: number;
  refresh: () => Promise<void>;
  setUsage: (u: Usage) => void;
  error: string | null;
}

const Ctx = createContext<MeCtx | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skew, setSkew] = useState(0);
  const [now, setNow] = useState(() => Date.now() / 1000);

  const refresh = useCallback(async () => {
    try {
      const m = await api.get<Me>("/api/me");
      setMe(m);
      setSkew(m.usage.now - Date.now() / 1000);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
    else setMe(null);
  }, [user, refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000 + skew), 1000);
    return () => clearInterval(t);
  }, [skew]);

  // When a window expires the server resets counters on next read: refresh once at the reset moment.
  const resetsAt = me?.usage.resets_at ?? null;
  useEffect(() => {
    if (resetsAt && now >= resetsAt) void refresh();
  }, [resetsAt, now, refresh]);

  const setUsage = useCallback((u: Usage) => setMe((m) => (m ? { ...m, usage: u } : m)), []);
  const value = useMemo(() => ({ me, usage: me?.usage ?? null, now, refresh, setUsage, error }), [me, now, refresh, setUsage, error]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMe() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMe outside MeProvider");
  return c;
}
