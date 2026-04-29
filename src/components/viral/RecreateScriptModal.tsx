import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Sparkles, RefreshCw, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { ViralVideo } from "@/lib/viral/types";

interface RecreateScriptModalProps {
  video: ViralVideo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "question" | "loading" | "result";

interface AdaptationQuestion {
  question: string;
  options: string[];
}

interface RecreatedScript {
  title: string;
  hook: string;
  script: string;
  structure: Array<{ timestamp: string; label: string; text: string }>;
}

export function RecreateScriptModal({ video, open, onOpenChange }: RecreateScriptModalProps) {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        setAccessToken(data.session?.access_token ?? null);
      });
    });
  }, [user]);

  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("question");
  const [adaptation, setAdaptation] = useState<AdaptationQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [result, setResult] = useState<RecreatedScript | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [error, setError] = useState("");

  // Cargar la pregunta de adaptación al abrir
  async function loadQuestion() {
    if (!accessToken) {
      setError("Necesitás iniciar sesión para usar la IA.");
      return;
    }
    setLoadingQuestion(true);
    setError("");
    try {
      const res = await fetch("/api/recreate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mode: "question",
          video: {
            caption: video.caption,
            transcript: video.transcript,
            niche: video.niche,
            hook: video.hookAnalysis.text,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al cargar la pregunta");
      }
      setAdaptation(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error inesperado";
      setError(msg);
    } finally {
      setLoadingQuestion(false);
    }
  }

  async function generateScript() {
    if (!accessToken) return;
    const userAdaptation = useCustom ? customAnswer.trim() : selectedOption;
    if (!userAdaptation) {
      toast.error("Elegí una opción o escribí tu propio ejemplo.");
      return;
    }
    setStep("loading");
    setError("");
    try {
      const res = await fetch("/api/recreate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mode: "generate",
          video: {
            caption: video.caption,
            transcript: video.transcript,
            niche: video.niche,
            hook: video.hookAnalysis.text,
            structure: video.structure,
          },
          userAdaptation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al generar el script");
      }
      setResult(data);
      setStep("result");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error inesperado";
      setError(msg);
      setStep("question");
      toast.error(msg);
    }
  }

  function reset() {
    setStep("question");
    setAdaptation(null);
    setSelectedOption("");
    setCustomAnswer("");
    setUseCustom(false);
    setResult(null);
    setError("");
  }

  function handleOpenChange(o: boolean) {
    if (o && !adaptation && !loadingQuestion) {
      loadQuestion();
    }
    if (!o) {
      // Pequeño delay para que no se vea el reset
      setTimeout(reset, 300);
    }
    onOpenChange(o);
  }

  function exportToEditor() {
    if (!result) return;
    try {
      sessionStorage.setItem(
        "viral-recreated-script",
        JSON.stringify({
          text: result.script,
          title: result.title,
          source: video.id,
        }),
      );
    } catch {
      // ignore
    }
    onOpenChange(false);
    navigate({ to: "/editor" });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Recrear video para tu nicho
          </DialogTitle>
          <DialogDescription>
            Adaptá este video viral a tu audiencia manteniendo la estructura que lo hizo funcionar.
          </DialogDescription>
        </DialogHeader>

        {/* Script original (solo lectura) */}
        <section className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Video original
          </p>
          <p className="text-sm font-medium text-foreground">{video.caption}</p>
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {video.transcript}
          </p>
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === "question" && (
          <section className="space-y-3">
            <Separator />
            <h4 className="text-sm font-semibold text-foreground">Pregunta de adaptación</h4>

            {loadingQuestion || !adaptation ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground leading-relaxed">{adaptation.question}</p>
                <div className="space-y-2">
                  {adaptation.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSelectedOption(opt);
                        setUseCustom(false);
                      }}
                      className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                        !useCustom && selectedOption === opt
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustom(true);
                      setSelectedOption("");
                    }}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                      useCustom
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    Tengo mi propio ejemplo
                  </button>
                  {useCustom && (
                    <Textarea
                      autoFocus
                      placeholder="Describí la situación o el ejemplo de tu nicho…"
                      value={customAnswer}
                      onChange={(e) => setCustomAnswer(e.target.value)}
                      maxLength={500}
                      rows={3}
                    />
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={generateScript} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generar script adaptado
                  </Button>
                </div>
              </>
            )}
          </section>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              La IA está reescribiendo el script para tu nicho…
            </p>
          </div>
        )}

        {step === "result" && result && (
          <section className="space-y-4">
            <Separator />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Script adaptado
              </p>
              <h4 className="text-sm font-semibold text-foreground mt-1">{result.title}</h4>
            </div>

            <div className="space-y-2">
              {result.structure.map((s, i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="font-mono text-[11px] font-semibold text-primary pt-0.5 shrink-0 w-12">
                    {s.timestamp}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{s.label}</p>
                    <p className="text-sm text-foreground leading-relaxed mt-0.5">{s.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Texto completo
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {result.script}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("question");
                  setResult(null);
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerar
              </Button>
              <Button onClick={exportToEditor} className="gap-2">
                Usar en el editor
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
