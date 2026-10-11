import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, refreshSession, setSessionEndedHandler } from "./api";

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  email_verified: boolean;
  is_admin: boolean;
  /** shown in the account menu */
  name: string;
}

interface Raw {
  id: string;
  email: string;
  username: string;
  email_verified: boolean;
  is_admin: boolean;
}
interface MeRaw {
  uid: string;
  email: string;
  username: string;
  email_verified: boolean;
  is_admin: boolean;
}
const toUser = (u: Raw): SessionUser => ({ ...u, name: u.username });

export interface SignupInput {
  username: string;
  email: string;
  contact: string;
  password: string;
}

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  signUp: (v: SignupInput) => Promise<{ devVerifyUrl?: string }>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signInGoogle: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** re-read the account (after verifying an e-mail, say) */
  reload: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const get = () => api.get<MeRaw>("/api/me");
      const me = await get().catch(async (e) => {
        if (e instanceof ApiError && e.status === 401 && (await refreshSession())) return get();
        throw e;
      });
      setUser(toUser({ id: me.uid, email: me.email, username: me.username, email_verified: me.email_verified, is_admin: me.is_admin }));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setSessionEndedHandler(() => setUser(null));
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const signUp = useCallback(async (v: SignupInput) => {
    const r = await api.post<{ user: Raw; dev_verify_url?: string }>("/api/auth/signup", v);
    setUser(toUser(r.user));
    return { devVerifyUrl: r.dev_verify_url };
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const r = await api.post<{ user: Raw }>("/api/auth/login", { identifier, password });
    setUser(toUser(r.user));
  }, []);

  const signInGoogle = useCallback(async (credential: string) => {
    const r = await api.post<{ user: Raw }>("/api/auth/google", { credential });
    setUser(toUser(r.user));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, signUp, signIn, signInGoogle, signOut, reload }), [user, loading, signUp, signIn, signInGoogle, signOut, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
