import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViralVideoDrawer } from "@/components/viral/ViralVideoDrawer";
import { SUGGESTED_NICHES, PLATFORM_LABELS, formatCompact, type Platform, type ViralVideo } from "@/lib/viral/types";

import { toast } from "sonner";

export const Route = createFileRoute("/inteligencia-viral/buscador")({
  component: BuscadorPage,
});

function BuscadorPage() {
  const [query, setQuery] = useState("");
  const [activeNiche, setActiveNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<ViralVideo[]>([]);
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [scoreFilter, setScoreFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [selected, setSelected] = useState<ViralVideo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function runSearch(niche: string) {
    if (!niche.trim()) return;
    setActiveNiche(niche);
    setLoading(true);
    setVideos([]);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Tu sesion expiró. Iniciá sesión de nuevo.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/buscar-virales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ niche, platform: platformFilter }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al buscar");
      setVideos(json.videos || []);
      if ((json.videos || []).length === 0) {
        toast.info(`No encontramos virales para "${niche}". Probá con un nicho en inglés o más específico.`);
      }
    } catch (e: any) {
      toast.error(e.message || "No se pudo buscar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      if (platformFilter !== "all" && v.platform !== platformFilter) return false;
      if (scoreFilter === "low" && (v.viralScore < 5 || v.viralScore >= 10)) return false;
      if (scoreFilter === "medium" && (v.viralScore < 10 || v.viralScore >= 20)) return false;
      if (scoreFilter === "high" && v.viralScore < 20) return false;
      return true;
    });
  }, [videos, platformFilter, scoreFilter]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Buscador de virales</h1>
        <p className="text-sm text-muted-foreground">
          Encontrá los videos que están reventando en tu nicho y descubrí por qué funcionan.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); runSearch(query); }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá tu nicho, ej: marketing digital"
            className="pl-9 h-10"
            maxLength={80}
          />
        </div>
        <Button type="submit" className="h-10">Buscar</Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_NICHES.map((n) => (
          <button
            key={n.key}
            type="button"
            onClick={() => { setQuery(n.label); runSearch(n.label); }}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-accent"
          >
            {n.label}
          </button>
        ))}
      </div>

      {activeNiche && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Mostrando virales de <span className="font-medium text-foreground">{activeNiche}</span>
          </p>
          <div className="flex gap-2 items-center">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as Platform | "all")}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las redes</SelectItem>
                {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
                  <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scoreFilter} onValueChange={(v) => setScoreFilter(v as typeof scoreFilter)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los scores</SelectItem>
                <SelectItem value="low">Bajo (5x-10x)</SelectItem>
                <SelectItem value="medium">Medio (10x-20x)</SelectItem>
                <SelectItem value="high">Alto (20x+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground text-center">
            Buscando virales reales en Instagram... esto puede tardar unos segundos.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : !activeNiche ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Buscá un nicho o elegí uno de los chips para ver los virales del momento.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center px-6">
          <p className="text-sm text-muted-foreground">
            No encontramos virales para <span className="font-medium text-foreground">"{activeNiche}"</span>. Probá con un nicho en inglés o uno más específico (ej: "fitness", "marketing").
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => { setSelected(v); setDrawerOpen(true); }}
              className="group relative aspect-[9/14] overflow-hidden rounded-xl bg-muted text-left ring-1 ring-border hover:ring-primary/50 transition-all"
            >
              {v.thumbnail ? (
                <img
                  src={v.thumbnail}
                  alt={v.caption}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-xs">
                  Sin preview
                </div>
              )}
              {/* Overlay oscuro */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />

              {/* Score arriba a la izquierda */}
              <div className="absolute top-2 left-2">
                <span className="inline-flex items-center rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm tracking-wide">
                  SCORE {v.viralScore.toFixed(2)}x
                </span>
              </div>

              {/* Info abajo */}
              <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 space-y-1 text-white">
                <p className="text-xs font-semibold truncate drop-shadow">@{v.creatorHandle?.replace("@", "")}</p>
                <div className="flex items-center gap-3 text-[10px] font-medium opacity-90">
                  <span>▶ {formatCompact(v.views)}</span>
                  <span>♥ {formatCompact(v.likes)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <ViralVideoDrawer video={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
