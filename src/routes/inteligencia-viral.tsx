import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Search, Eye, UserSearch, Video, Sparkles } from "lucide-react";
import logoPinpost from "@/assets/logo-pinpost.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inteligencia-viral")({
  component: InteligenciaViralLayout,
});

const TABS = [
  { to: "/inteligencia-viral/buscador", label: "Buscador", icon: Search },
  { to: "/inteligencia-viral/spy-agent", label: "Spy Agent", icon: Eye },
  { to: "/inteligencia-viral/analizar-perfil", label: "Analizar Perfil", icon: UserSearch },
  { to: "/inteligencia-viral/mis-videos", label: "Mis Videos", icon: Video },
] as const;

function InteligenciaViralLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user && !redirecting) {
      setRedirecting(true);
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate, redirecting]);

  // Redirigir desde /inteligencia-viral exacto al primer tab
  useEffect(() => {
    if (location.pathname === "/inteligencia-viral" || location.pathname === "/inteligencia-viral/") {
      navigate({ to: "/inteligencia-viral/buscador", replace: true });
    }
  }, [location.pathname, navigate]);

  if (loading || redirecting || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header igual al del dashboard */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-white px-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <img src={logoPinpost} alt="PinPost" className="h-7 w-auto" />
          </Link>
          <span className="hidden md:inline text-xs text-muted-foreground">/</span>
          <div className="hidden md:flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Inteligencia Viral
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">Volver al panel</Link>
          </Button>
          <span className="text-xs text-muted-foreground hidden lg:inline">{user.email}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Sub-tabs */}
      <nav className="sticky top-14 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto -mx-1 px-1 scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname.startsWith(tab.to);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
