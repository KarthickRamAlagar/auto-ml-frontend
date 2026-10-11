import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { applyServerErrors, emailRule } from "@/lib/forms";
import { useSeo } from "@/lib/seo";

const schema = z.object({ email: emailRule });
type Values = z.infer<typeof schema>;

export default function ForgotPassword() {
  useSeo({ title: "Reset password · Auto ML", noindex: true });
  const [done, setDone] = useState<{ message: string; dev?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we will send a link that works for one hour."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="space-y-3 text-sm" role="status">
          <p className="rounded-md bg-muted/60 px-3 py-2">{done.message}</p>
          {done.dev && (
            <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
              Local mode (no mail service): <a className="underline" href={done.dev}>open the reset link</a>
            </p>
          )}
        </div>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit(async (v) => {
            setErr(null);
            try {
              const r = await api.post<{ message: string; dev_reset_url?: string }>("/api/auth/forgot", v);
              setDone({ message: r.message, dev: r.dev_reset_url });
            } catch (e) {
              setErr(applyServerErrors(e, setError));
            }
          })}
        >
          <Field label="Email" type="email" autoComplete="email" autoFocus error={formState.errors.email?.message} {...register("email")} />
          {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{err}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={formState.isSubmitting}>
            {formState.isSubmitting && <Spinner />} Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
