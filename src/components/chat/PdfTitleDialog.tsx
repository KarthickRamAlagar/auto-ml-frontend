import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/progress";
import { pdfFileName } from "@/lib/brand";

/** Asks for the report's title before the PDF is built. The title is printed on the cover and becomes the file name. */
export function PdfTitleDialog({
  open,
  onOpenChange,
  defaultTitle,
  busy,
  stage,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTitle: string;
  busy: boolean;
  stage: string | null;
  onConfirm: (title: string) => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  useEffect(() => {
    if (open) setTitle(defaultTitle);
  }, [open, defaultTitle]);
  const clean = title.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="grid-cols-[minmax(0,1fr)]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Name your report</DialogTitle>
          <DialogDescription>This title is printed on the first page and used as the PDF file name.</DialogDescription>
        </DialogHeader>
        <form
          className="min-w-0 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (clean && !busy) onConfirm(clean);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pdf-title">Report title</Label>
            <Input id="pdf-title" value={title} maxLength={90} autoFocus onChange={(e) => setTitle(e.target.value)} onFocus={(e) => e.target.select()} placeholder="e.g. Customer churn analysis" />
            <p className="truncate text-xs text-muted-foreground">File name: {pdfFileName(clean)}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!clean || busy}>
              {busy ? <Spinner /> : <Download />} {busy ? `${stage ?? "Building PDF"}…` : "Download PDF"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
