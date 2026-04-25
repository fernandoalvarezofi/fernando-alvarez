import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Video as VideoIcon, Link2, CheckCircle2, AlertTriangle, Lightbulb, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PLATFORM_LABELS, formatCompact, type Platform } from "@/lib/viral/types";
import { PlatformIcon } from "@/components/viral/PlatformIcon";

export const Route = createFileRoute("/inteligencia-viral/mis-videos")({
  component: MisVideosPage,
});

interface UserVideo {
  id: string;
  url: string;
  platform: Platform;
  caption: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  comments: number;
  niche: string;
  niche_avg_views: number;
  niche_score: number;
  analysis: {
    strengths?: string[];
    improvements?: string[];
    suggestion?: string;
  } | null;
}

function generateMockAnalysis(video: { views: number; niche_avg_views: number }) {
  const ratio = video.niche_avg_views > 0 ? video.views / video.niche_avg_views : 1;
  const strong = ratio >= 1;
  return {
    strengths: strong
      ? ["Tu hook retiene un 40% más que el promedio de tu nicho.", "Buena densidad de información en los primeros 15 segundos."]
      : ["La estructura general respeta los beats virales del nicho."],
    improvements: strong
      ? ["El CTA podría ser más específico en los últimos 3 segundos."]
      : ["El video no tiene un CTA claro al final.", "El hook tarda demasiado en aparecer."],
    suggestion: strong
      ? "Reforzá el cierre con una pregunta directa que invite a comentar."
      : "Acortá la introducción a 3 segundos máximo y agregá un CTA explícito al final.",
  };
}

function MisVideosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<UserVideo | null>(null);

  const [form, setForm] = useState({
    url: "", platform: "instagram" as Platform, caption: "",
    views: "", likes: "", comments: "", niche: "", niche_avg_views: "",
  });

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.from("user_videos").select("*").order("created_at", { ascending: false });
        if (mounted && data) setVideos(data as unknown as UserVideo[]);
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [user]);

  const addVideo = useCallback(async () => {
    if (!user) return;
    if (!form.url.trim()) { toast.error("Ingresá la URL del video."); return; }
    const views = parseInt(form.views) || 0;
    const niche_avg_views = parseInt(form.niche_avg_views) || Math.max(views, 1000);
    const niche_score = +(views / niche_avg_views).toFixed(2);
    const analysis = generateMockAnalysis({ views, niche_avg_views });

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.from("user_videos").insert({
        user_id: user.id,
        url: form.url.trim(),
        platform: form.platform,
        caption: form.caption.trim().slice(0, 500),
        thumbnail_url: `https://picsum.photos/seed/${encodeURIComponent(form.url)}/640/640`,
        views,
        likes: parseInt(form.likes) || 0,
        comments: parseInt(form.comments) || 0,
        niche: form.niche.trim().slice(0, 80),
        niche_avg_views,
        niche_score,
        analysis,
      }).select().single();
      if (error) throw error;
      setVideos((prev) => [data as unknown as UserVideo, ...prev]);
      setAddOpen(false);
      setForm({ url: "", platform: "instagram", caption: "", views: "", likes: "", comments: "", niche: "", niche_avg_views: "" });
      toast.success("Video agregado.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo agregar el video.");
    }
  }, [form, user]);

  async function deleteVideo(id: string) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("user_videos").delete().eq("id", id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (e) { console.error(e); }
  }

  function improveWithAI(v: UserVideo) {
    try {
      sessionStorage.setItem("viral-recreated-script", JSON.stringify({
        text: v.caption,
        title: `Mejora: ${v.caption.slice(0, 40)}`,
        source: v.id,
        improvements: v.analysis?.improvements,
        suggestion: v.analysis?.suggestion,
      }));
    } catch { /* ignore */ }
    navigate({ to: "/editor" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mis videos</h1>
          <p className="text-sm text-muted-foreground">
            Cargá tus videos y compará su rendimiento contra el promedio viral de tu nicho.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="outline" disabled className="gap-1.5 cursor-not-allowed opacity-60">
                    <Link2 className="h-3.5 w-3.5" /> Conectar cuenta
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Próximamente</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Agregar video
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <VideoIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Todavía no agregaste videos</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Agregá tus videos manualmente para recibir un análisis comparado contra el promedio de tu nicho.
          </p>
          <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Agregar mi primer video
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <button type="button" onClick={() => setSelected(v)} className="block w-full text-left">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  <div className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-md bg-background/90 backdrop-blur-sm shadow-sm">
                    <PlatformIcon platform={v.platform} size={14} />
                  </div>
                  <div className="absolute top-2 right-2 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-primary text-primary-foreground">
                    {v.niche_score >= 1 ? `${v.niche_score.toFixed(1)}x` : `${v.niche_score.toFixed(2)}x`}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug min-h-[2.5em]">
                    {v.caption || "Sin descripción"}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatCompact(v.views)} vistas · {formatCompact(v.likes)} likes</span>
                  </div>
                </div>
              </button>
              <div className="px-3 pb-3 flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">{v.niche || "Sin nicho"}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteVideo(v.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal alta */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Agregar video manualmente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">URL del video</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." maxLength={500} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Red social</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as Platform })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
                      <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tu nicho</Label>
                <Input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="ej: fitness" maxLength={80} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Caption / título</Label>
              <Input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Descripción" maxLength={500} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Vistas</Label>
                <Input type="number" min={0} value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Likes</Label>
                <Input type="number" min={0} value={form.likes} onChange={(e) => setForm({ ...form, likes: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comentarios</Label>
                <Input type="number" min={0} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Promedio de vistas en tu nicho (opcional)</Label>
              <Input type="number" min={0} value={form.niche_avg_views} onChange={(e) => setForm({ ...form, niche_avg_views: e.target.value })} placeholder="ej: 10000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={addVideo}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de informe */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          {selected && (
            <>
              <div className="aspect-video bg-muted overflow-hidden relative">
                <img src={selected.thumbnail_url} alt="" className="h-full w-full object-cover" />
                <div className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-md bg-background/90 backdrop-blur-sm shadow-sm">
                  <PlatformIcon platform={selected.platform} size={16} />
                </div>
              </div>
              <div className="px-6 py-5 space-y-5">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-base font-semibold leading-snug">{selected.caption || "Sin descripción"}</SheetTitle>
                </SheetHeader>

                {/* Score gauge simple */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Score vs. promedio del nicho</p>
                    <span className="text-lg font-semibold text-foreground">{selected.niche_score.toFixed(2)}x</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, selected.niche_score * 50)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tu video: {formatCompact(selected.views)} · Promedio del nicho: {formatCompact(selected.niche_avg_views)}
                  </p>
                </div>

                {selected.analysis?.strengths && selected.analysis.strengths.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Puntos fuertes</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {selected.analysis.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/30">{s}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {selected.analysis?.improvements && selected.analysis.improvements.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Áreas de mejora</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {selected.analysis.improvements.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-border">{s}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {selected.analysis?.suggestion && (
                  <section className="rounded-lg bg-accent/50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Sugerencia accionable</h4>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{selected.analysis.suggestion}</p>
                  </section>
                )}

                <Button className="w-full gap-2" onClick={() => improveWithAI(selected)}>
                  <Sparkles className="h-4 w-4" /> Mejorar con IA
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
