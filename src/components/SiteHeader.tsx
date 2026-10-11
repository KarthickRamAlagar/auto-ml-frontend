import { Link } from "react-router-dom";
import { BetaChip, Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link to="/" aria-label="Auto ML home">
          <Logo />
        </Link>
        <BetaChip />
        <nav className="ml-auto flex items-center gap-1" aria-label="Main">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/pricing">Pricing</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to={user ? "/auto-ml" : "/login"}>{user ? "Open app" : "Sign in"}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t py-8 text-center text-xs text-muted-foreground">
      <p>Auto ML · A guided AutoML workspace for students and analysts. Your datasets are processed in memory and never stored.</p>
    </footer>
  );
}
