import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo";

export default function NotFound() {
  useSeo({ title: "Page not found · Auto ML", noindex: true });
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="space-y-3">
        <p className="font-serif text-5xl">404</p>
        <p className="text-muted-foreground">That page doesn't exist.</p>
        <Button asChild>
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
