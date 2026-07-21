import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logo from "@/assets/solvpath-logo.png";
import { signOut, useSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const navigate = useNavigate();
  const router = useRouter();

  async function handleSignOut() {
    signOut();
    await router.invalidate();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/orders" className="flex items-center gap-2" aria-label="Solvpath home">
            <img src={logo} alt="Solvpath" className="h-7 w-auto" />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link
              to="/orders"
              className="rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent-soft hover:text-accent-deep"
              activeProps={{ className: "rounded-md px-3 py-2 bg-accent-soft text-accent-deep" }}
            >
              My orders
            </Link>
            {session && (
              <div className="ml-2 flex items-center gap-2 border-l border-border pl-3">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {session.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
      </main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Solvpath. Support available 24/7.
        </div>
      </footer>
    </div>
  );
}
