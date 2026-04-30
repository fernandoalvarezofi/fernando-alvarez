import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Search, Eye, UserSearch, Video, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import logoPinpost from "@/assets/logo-pinpost.png";

export const Route = createFileRoute("/inteligencia-viral")({
  component: InteligenciaViralLayout,
});

const NAV = [
  { to: "/inteligencia-viral/buscador", label: "Buscador Viral", icon: Search },
  { to: "/inteligencia-viral/spy-agent", label: "Spy Agent", icon: Eye },
  { to: "/inteligencia-viral/analizar-perfil", label: "Analizar perfil", icon: UserSearch },
  { to: "/inteligencia-viral/mis-videos", label: "Mis Videos", icon: Video },
] as const;

function InteligenciaViralLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);
  const [credits, setCredits] = useState<{ used: number; total: number } | null>(null);

  useEffect(() => {
    if (!loading && !user && !redirecting) {
      setRedirecting(true);
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate, redirecting]);

  useEffect(() => {
    if (location.pathname === "/inteligencia-viral" || location.pathname === "/inteligencia-viral/") {
      navigate({ to: "/inteligencia-viral/buscador", replace: true });
    }
  }, [location.pathname, navigate]);

  // Cargar créditos del usuario (crear registro si no existe)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_credits")
        .select("credits_used, credits_total")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setCredits({ used: data.credits_used, total: data.credits_total });
      } else {
        await supabase.from("user_credits").insert({ user_id: user.id, credits_used: 0, credits_total: 40 });
        if (!cancelled) setCredits({ used: 0, total: 40 });
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || redirecting || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const total = credits?.total ?? 40;
  const used = credits?.used ?? 0;
  const creditsLeft = Math.max(0, total - used);
  const creditsPct = total > 0 ? (creditsLeft / total) * 100 : 0;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* SIDEBAR */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-card">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <img src={logoPinpost} alt="WOREF" className="h-7 w-auto" />
          </Link>
          <p className="mt-3 text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Inteligencia Viral
          </p>
          <p className="text-[11px] text-muted-foreground">by WOREF</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Créditos + logout */}
        <div className="px-3 pb-4 pt-2 border-t border-border space-y-3">
          <div className="rounded-xl bg-background border border-border p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">Créditos</span>
              <span className="font-semibold text-foreground">{creditsLeft} / {total}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${creditsPct}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/inteligencia-viral/buscador" })}
            className="w-full rounded-xl bg-foreground py-2 text-xs font-semibold text-background hover:opacity-80 transition-opacity"
          >
            ↑ Mejorar plan
          </button>
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile top bar (sidebar oculta en móvil) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logoPinpost} alt="WOREF" className="h-6 w-auto" />
          <span className="text-sm font-semibold text-foreground">Viral</span>
        </Link>
        <button onClick={signOut} className="text-muted-foreground"><LogOut className="h-4 w-4" /></button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-card">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>

      {/* CONTENIDO */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
