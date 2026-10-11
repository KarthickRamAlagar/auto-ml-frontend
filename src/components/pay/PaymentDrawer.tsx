import { CheckCircle2, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Ledger } from "@/components/chat/ConfirmCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { Payment } from "@/lib/types";
import { copyText, fmtInr } from "@/lib/utils";

export function PaymentDrawer({
  open,
  onOpenChange,
  jobId,
  kind,
  onClaimed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  jobId: string;
  kind: "models" | "report";
  onClaimed: (message: string, payment: Payment) => void;
}) {
  const [pay, setPay] = useState<Payment | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setErr(null);
    setPay(null);
    api
      .post<Payment>("/api/payments", { kind, job_id: jobId })
      .then((p) => alive && setPay(p))
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [open, jobId, kind]);

  const claim = async () => {
    if (!pay) return;
    setBusy(true);
    try {
      const r = await api.post<{ payment: Payment; chat_message: string }>(`/api/payments/${pay.id}/claim`);
      onClaimed(r.chat_message, r.payment);
      onOpenChange(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="mx-auto w-full max-w-4xl">
        <DialogHeader>
          <DialogTitle>{kind === "report" ? "Download your report" : "You've gone past your free runs"}</DialogTitle>
          <DialogDescription>
            {kind === "report" ? "Reports cost ₹5 after your first two." : "Scan the QR with any UPI app and pay the amount below. The reference code is already in the payment note."}
          </DialogDescription>
        </DialogHeader>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        {!pay && !err && (
          <div className="grid flex-1 place-items-center py-10">
            <Spinner />
          </div>
        )}
        {pay && (
          <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
            <div className="mx-auto space-y-2 text-center">
              <div className="rounded-xl border bg-white p-3">
                <QRCodeSVG value={pay.upi_uri} size={176} level="M" marginSize={0} />
              </div>
              <p className="text-xs text-muted-foreground">Paying {pay.payee}</p>
              <a href={pay.upi_uri} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary sm:hidden">
                <Smartphone className="size-3.5" /> Open in UPI app
              </a>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Amount to pay</p>
                <p className="font-serif text-4xl tabular-nums">{fmtInr(pay.amount)}</p>
              </div>
              <Ledger q={pay.breakdown as never} />
              <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                <span>
                  Reference <b className="font-mono tracking-wide">{pay.ref}</b>
                </span>
                <button
                  type="button"
                  className="text-xs text-primary"
                  onClick={async () => {
                    if (await copyText(pay.ref)) {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <Button className="w-full" size="lg" disabled={busy} onClick={claim}>
                {busy ? <Spinner /> : <CheckCircle2 />} I've paid
              </Button>
              <p className="text-xs text-muted-foreground">
                Your results unlock right away while the admin verifies the payment. If it can't be matched, the results lock again and paid features are paused.
              </p>
            </div>
          </div>
        )}
        </div>
      </SheetContent>
    </Dialog>
  );
}
