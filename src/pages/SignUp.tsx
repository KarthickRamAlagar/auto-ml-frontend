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
import { applyServerErrors, contactRule, emailRule, passwordRule, usernameRule } from "@/lib/forms";
import { useSeo } from "@/lib/seo";

const schema = z
  .object({
    username: usernameRule,
    email: emailRule,
    contact: contactRule,
    password: passwordRule,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] })
  .refine((v) => !v.password.toLowerCase().includes(v.email.split("@")[0]!.toLowerCase()) && v.password.toLowerCase() !== v.username.toLowerCase(), {
    message: "Password must not contain your username or email name.",
    path: ["password"],
  });
type Values = z.infer<typeof schema>;

export default function SignUp() {
  useSeo({ title: "Create account · Auto ML", noindex: true });
  const { user, loading, signUp } = useAuth();
  const loc = useLocation();
  const [err, setErr] = useState<string | null>(null);
  const from = (loc.state as { from?: string } | null)?.from ?? "/auto-ml";
  const { register, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "", contact: "", password: "", confirm: "" },
  });
  const e = formState.errors;

  if (loading) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;
  if (user) return <Navigate to={from} replace />;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to start. Your first models are on us."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" state={loc.state} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton onError={setErr} text="signup_with" />
      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(async (v) => {
          setErr(null);
          try {
            await signUp({ username: v.username, email: v.email, contact: v.contact, password: v.password });
          } catch (x) {
            setErr(applyServerErrors(x, setError));
          }
        })}
      >
        <Field label="Username" autoComplete="username" autoFocus error={e.username?.message} hint="Letters, numbers and underscores." {...register("username")} />
        <Field label="Email" type="email" autoComplete="email" error={e.email?.message} {...register("email")} />
        <Field label="Contact number" type="tel" autoComplete="tel" placeholder="+919876543210" error={e.contact?.message} {...register("contact")} />
        <Field label="Password" type="password" autoComplete="new-password" error={e.password?.message} hint="At least 10 characters with a letter and a number." {...register("password")} />
        <Field label="Confirm password" type="password" autoComplete="new-password" error={e.confirm?.message} {...register("confirm")} />
        {err && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {err}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Spinner />} Create account
        </Button>
        <p className="text-center text-xs text-muted-foreground">We will send a link to confirm your email.</p>
      </form>
    </AuthShell>
  );
}
