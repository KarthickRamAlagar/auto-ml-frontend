import { BarChart3, Code2, MessagesSquare, ShieldCheck, Swords, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { PricingSection } from "@/components/PricingSection";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";

const FEATURES = [
  { icon: MessagesSquare, t: "Guided like a chat", d: "Answer a few questions, with a recommended option each time. No code, no config files." },
  { icon: Code2, t: "See the code run", d: "Every step streams live with the exact scikit-learn code, ready to copy or download as a script." },
  { icon: BarChart3, t: "EDA with inference", d: "Distributions, missing values, correlations and a plain-English reading of what they mean." },
  { icon: Trophy, t: "Compare up to 25 models", d: "Classification and regression, with grid-search tuning, metrics, and a clear conclusion." },
  { icon: Swords, t: "Quiz arena discounts", d: "Answer 7 timed MCQs while training runs and earn money off your bill." },
  { icon: ShieldCheck, t: "Your data stays yours", d: "Datasets live in memory for one run and are deleted at the end. We never store them." },
];

const FAQ = [
  ["Do you store my dataset?", "No. It is held in memory only while your run executes, then discarded. We keep your email, usage counts, feedback and payment records."],
  ["Where do datasets come from?", "Built-in samples, Kaggle, Hugging Face, your own CSV upload, or a link to a CSV file."],
  ["How does payment work?", "After the free models, scan a UPI QR, tap “I've paid”, and your results unlock while the admin verifies."],
];

export default function Landing() {
  useSeo({
    title: "Auto ML · Train and compare machine learning models by chatting",
    description: "A guided AutoML workspace: pick a dataset, answer a few questions, and watch classification and regression models train with live code, EDA and a clear conclusion.",
    path: "/",
  });
  const { user } = useAuth();
  const cta = user ? "/auto-ml" : "/login";
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-3xl px-4 pb-16 pt-20 text-center">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            A sub-product of the Auto DISM Platform · Beta stage
          </p>
          <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">Train and compare machine learning models by chatting</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">Pick a dataset, answer a few questions, and watch real models train, with live code, EDA charts and a plain-English conclusion.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg" asChild>
              <Link to={cta}>Start free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">10 models free. No card needed.</p>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="features">
          <h2 id="features" className="sr-only">
            Features
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border bg-card p-5">
                <Icon className="mb-3 size-5 text-primary" />
                <h3 className="font-serif text-[17px] font-medium">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="pricing">
          <h2 id="pricing" className="mb-6 text-center font-serif text-3xl">
            Pricing
          </h2>
          <PricingSection />
        </section>

        <section className="mx-auto max-w-2xl px-4 pb-20" aria-labelledby="faq">
          <h2 id="faq" className="mb-4 text-center font-serif text-3xl">
            Questions
          </h2>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="rounded-xl border bg-card px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium">{q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
