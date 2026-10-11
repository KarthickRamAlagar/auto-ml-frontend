import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { applyServerErrors } from "@/lib/forms";
import { useSeo } from "@/lib/seo";

const schema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or username.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
});
type Values = z.infer<typeof schema>;

export default function Login() {
  useSeo({ title: "Sign in · Auto ML", noindex: true });
  const { user, loading, signIn } = useAuth();
  const loc = useLocation();
  const [err, setErr] = useState<string | null>(null);
  const from = (loc.state as { from?: string } | null)?.from ?? "/auto-ml";
  const { register, handleSubmit, setError, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } });

  if (loading) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;
  if (user) return <Navigate to={from} replace />;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to train and compare machine learning models."
      footer={
        <>
          New to Auto ML?{" "}
          <Link to="/signup" state={loc.state} className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton onError={setErr} text="signin_with" />
      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(async (v) => {
          setErr(null);
          try {
            await signIn(v.identifier, v.password);
          } catch (e) {
            setErr(applyServerErrors(e, setError));
          }
        })}
      >
        <Field label="Email or username" autoComplete="username" autoFocus error={formState.errors.identifier?.message} {...register("identifier")} />
        <Field label="Password" type="password" autoComplete="current-password" error={formState.errors.password?.message} {...register("password")} />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
            Forgot password?
          </Link>
        </div>
        {err && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {err}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Spinner />} Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
