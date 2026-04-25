import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlatformIcon } from "./PlatformIcon";
import { ViralScoreBadge } from "./ViralScoreBadge";
import { Sparkles, Eye, Heart, MessageCircle, Quote, Brain, Clock } from "lucide-react";
import { formatCompact, type ViralVideo } from "@/lib/viral/types";
import { useState } from "react";
import { RecreateScriptModal } from "./RecreateScriptModal";

interface ViralVideoDrawerProps {
  video: ViralVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViralVideoDrawer({ video, open, onOpenChange }: ViralVideoDrawerProps) {
  const [recreateOpen, setRecreateOpen] = useState(false);

  if (!video) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto bg-background p-0"
        >
          {/* Hero */}
          <div className="relative aspect-video w-full bg-muted overflow-hidden">
            <img src={video.thumbnail} alt={video.caption} className="h-full w-full object-cover" />
            <div className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-md bg-background/90 backdrop-blur-sm shadow-sm">
              <PlatformIcon platform={video.platform} size={16} />
            </div>
            <div className="absolute top-3 right-3">
              <ViralScoreBadge score={video.viralScore} />
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <SheetHeader className="space-y-2 text-left">
              <div className="flex items-center gap-2.5">
                <img
                  src={video.creatorAvatar}
                  alt={video.creatorName}
                  className="h-9 w-9 rounded-full bg-muted"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{video.creatorName}</p>
                  <p className="text-xs text-muted-foreground truncate">{video.creatorHandle}</p>
                </div>
              </div>
              <SheetTitle className="text-base font-semibold leading-snug">
                {video.caption}
              </SheetTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {formatCompact(video.views)} vistas
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" /> {formatCompact(video.likes)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" /> {formatCompact(video.comments)}
                </span>
              </div>
            </SheetHeader>

            <Separator />

            {/* Hook */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Quote className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Análisis del Hook</h3>
              </div>
              <blockquote className="rounded-lg border-l-2 border-primary bg-muted/50 px-3 py-2 text-sm italic text-foreground">
                "{video.hookAnalysis.text}"
              </blockquote>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Por qué funciona: </span>
                {video.hookAnalysis.why}
              </p>
            </section>

            <Separator />

            {/* Estructura viral */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Estructura viral</h3>
              </div>
              <ol className="space-y-2.5">
                {video.structure.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-mono text-[11px] font-semibold text-primary pt-0.5 shrink-0 w-12">
                      {step.timestamp}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <Separator />

            {/* Transcripción */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Transcripción completa</h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {video.transcript}
              </p>
            </section>

            <Separator />

            {/* Disparadores psicológicos */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Disparadores psicológicos</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {video.triggers.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-accent text-accent-foreground px-2 py-1 text-[11px] font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>

            {/* CTA */}
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => setRecreateOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Recrear este video para mi nicho
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <RecreateScriptModal
        open={recreateOpen}
        onOpenChange={setRecreateOpen}
        video={video}
      />
    </>
  );
}
