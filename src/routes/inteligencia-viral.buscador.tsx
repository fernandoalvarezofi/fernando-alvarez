import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViralVideoCard } from "@/components/viral/ViralVideoCard";
import { ViralVideoDrawer } from "@/components/viral/ViralVideoDrawer";
import { SUGGESTED_NICHES, PLATFORM_LABELS, type Platform, type ViralVideo } from "@/lib/viral/types";
import { getMockViralVideos } from "@/lib/viral/mockData";

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

  function runSearch(niche: string) {
    if (!niche.trim()) return;
    setActiveNiche(niche);
    setLoading(true);
    // Simulamos llamada a API
    setTimeout(() => {
      setVideos(getMockViralVideos(niche, 16));
      setLoading(false);
    }, 600);
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
    <div className="space-y-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : !activeNiche ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Buscá un nicho o elegí uno de los chips para ver los virales del momento.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No hay videos que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((v) => (
            <ViralVideoCard
              key={v.id}
              video={v}
              onClick={() => { setSelected(v); setDrawerOpen(true); }}
            />
          ))}
        </div>
      )}

      <ViralVideoDrawer video={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
