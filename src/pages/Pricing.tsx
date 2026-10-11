import { PricingSection } from "@/components/PricingSection";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { useSeo } from "@/lib/seo";

export default function Pricing() {
  useSeo({ title: "Pricing · Auto ML", description: "10 models free per window, then ₹2 per model. Quiz discounts, optional video lectures and ₹5 reports.", path: "/pricing" });
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-14">
        <h1 className="mb-2 text-center font-serif text-4xl">Pricing</h1>
        <p className="mb-8 text-center text-muted-foreground">Start free. Pay only for what you use.</p>
        <PricingSection />
      </main>
      <SiteFooter />
    </div>
  );
}
