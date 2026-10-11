import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Client-side pagination. Resets to page 1 when the list length changes. */
export function usePaged<T>(items: T[], size: number) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / size));
  useEffect(() => {
    setPage((p) => Math.min(p, pages - 1));
  }, [pages]);
  const slice = useMemo(() => items.slice(page * size, page * size + size), [items, page, size]);
  return { slice, page, pages, setPage, total: items.length, from: items.length ? page * size + 1 : 0, to: Math.min(items.length, page * size + size) };
}

export function Pager({ page, pages, setPage, total, from, to, className, always }: ReturnType<typeof usePaged> & { className?: string; always?: boolean }) {
  if (pages <= 1 && !(always && total > 0)) return null;
  return (
    <nav className={cn("no-print flex items-center justify-between gap-3 pt-2 text-xs text-muted-foreground", className)} aria-label="Pagination">
      <span className="tabular-nums">
        {from}–{to} of {total}
      </span>
      <span className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="min-w-14 text-center tabular-nums">
          {page + 1} / {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
      </span>
    </nav>
  );
}
