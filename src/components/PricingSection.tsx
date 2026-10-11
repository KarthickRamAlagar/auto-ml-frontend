import { Check } from "lucide-react";

const ROWS = [
  ["10 models", "Free", "per 5h 40m window"],
  ["15 more models", "₹2 each", "up to 25 models per window"],
  ["Video lecture for a model", "₹2", "optional add-on"],
  ["Team of 2", "+5%", "on the subtotal"],
  ["Report download (PDF)", "₹5", "first 2 are free"],
] as const;

export function PricingSection() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="font-serif text-xl">Simple, pay-as-you-go</h3>
        <dl className="mt-4 divide-y">
          {ROWS.map(([a, b, c]) => (
            <div key={a} className="flex items-baseline justify-between gap-3 py-2.5">
              <dt>
                <span className="block text-sm font-medium">{a}</span>
                <span className="block text-xs text-muted-foreground">{c}</span>
              </dt>
              <dd className="font-serif text-lg">{b}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="font-serif text-xl">Ways to pay less</h3>
        <ul className="mt-4 space-y-3 text-sm">
          {[
            "Play the 7-question quiz: every correct answer takes ₹0.25 off, up to half of your bill.",
            "Spend more than ₹50 and your usage window gets 3% shorter; over ₹100, 6% shorter.",
            "Pay with any UPI app. Scan the QR, tap “I've paid”, and results unlock instantly.",
            "Your bill is rounded to a whole rupee. Nothing is charged until you confirm.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
