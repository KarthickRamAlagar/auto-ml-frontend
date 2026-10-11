import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";

export default function VerifyEmail() {
  useSeo({ title: "Confirm your email · Auto ML", noindex: true });
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, reload } = useAuth();
  const [state, setState] = useState<"working" | "ok" | "bad">(token ? "working" : "bad");
  const [msg, setMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // the link is single-use: never submit it twice (React strict mode runs effects twice in dev)
    api
      .post("/api/auth/verify-email", { token })
      .then(async () => {
        setState("ok");
        await reload();
      })
      .catch((e: Error) => {
        setMsg(e.message);
        setState("bad");
      });
  }, [token, reload]);

  const resend = async () => {
    try {
      await api.post("/api/auth/resend-verification");
      setMsg("A new link is on its way.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <AuthShell title="Confirm your email">
      {state === "working" && <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Spinner /> Checking your link…</p>}
      {state === "ok" && (
        <div className="space-y-4 text-center" role="status">
          <p className="text-sm">Your email is confirmed. Thank you.</p>
          <Button asChild size="lg" className="w-full"><Link to={user ? "/auto-ml" : "/login"}>Continue</Link></Button>
        </div>
      )}
      {state === "bad" && (
        <div className="space-y-4 text-center">
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{msg || "This link is invalid or has expired."}</p>
          {user ? <Button variant="outline" onClick={() => void resend()}>Send a new link</Button> : <Button asChild variant="outline"><Link to="/login">Sign in to request a new link</Link></Button>}
        </div>
      )}
    </AuthShell>
  );
}
