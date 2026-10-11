import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { applyServerErrors, passwordRule } from "@/lib/forms";
import { useSeo } from "@/lib/seo";

const schema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });
type Values = z.infer<typeof schema>;

export default function ResetPassword() {
  useSeo({ title: "Choose a new password · Auto ML", noindex: true });
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  return (
    <AuthShell title="Choose a new password" subtitle="You will be signed out everywhere else." footer={<Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}>
      {!token ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          This link is incomplete. <Link className="underline" to="/forgot-password">Request a new one</Link>.
        </p>
      ) : done ? (
        <p className="rounded-md bg-muted/60 px-3 py-2 text-sm" role="status">
          Password updated. <Link className="font-medium text-primary underline" to="/login">Sign in</Link> with your new password.
        </p>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit(async (v) => {
            setErr(null);
            try {
              await api.post("/api/auth/reset", { token, password: v.password });
              setDone(true);
            } catch (e) {
              setErr(applyServerErrors(e, setError));
            }
          })}
        >
          <Field label="New password" type="password" autoComplete="new-password" autoFocus error={formState.errors.password?.message} hint="At least 10 characters with a letter and a number." {...register("password")} />
          <Field label="Confirm new password" type="password" autoComplete="new-password" error={formState.errors.confirm?.message} {...register("confirm")} />
          {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{err}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={formState.isSubmitting}>
            {formState.isSubmitting && <Spinner />} Update password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
