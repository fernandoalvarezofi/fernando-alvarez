import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Eye, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PLATFORM_LABELS, type Platform, type ViralVideo } from "@/lib/viral/types";
import { PlatformIcon } from "@/components/viral/PlatformIcon";
import { ViralScoreBadge } from "@/components/viral/ViralScoreBadge";
import { ViralVideoDrawer } from "@/components/viral/ViralVideoDrawer";
import { getMockViralVideos } from "@/lib/viral/mockData";

export const Route = createFileRoute("/inteligencia-viral/spy-agent")({
  component: SpyAgentPage,
});

interface TrackedAccount {
  id: string;
  handle: string;
  platform: Platform;
  display_name: string;
  avatar_url: string;
  is_active: boolean;
  last_viral_at: string | null;
  last_viral_score: number | null;
  last_viral_thumbnail: string;
  detected_within_24h: boolean;
}

interface Settings {
  email_alerts_enabled: boolean;
  alert_frequency: "immediate" | "daily";
  min_score_threshold: number;
}

const MAX_ACCOUNTS = 20;

function SpyAgentPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [settings, setSettings] = useState<Settings>({
    email_alerts_enabled: true,
    alert_frequency: "immediate",
    min_score_threshold: 5,
  });
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [newPlatform, setNewPlatform] = useState<Platform>("instagram");
  const [drawerVideo, setDrawerVideo] = useState<ViralVideo | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const [accRes, setRes] = await Promise.all([
          supabase.from("tracked_accounts").select("*").order("created_at", { ascending: false }),
          supabase.from("spy_agent_settings").select("*").eq("user_id", user.id).maybeSingle(),
        ]);
        if (!mounted) return;
        if (accRes.data) setAccounts(accRes.data as TrackedAccount[]);
        if (setRes.data) {
          setSettings({
            email_alerts_enabled: setRes.data.email_alerts_enabled,
            alert_frequency: setRes.data.alert_frequency as "immediate" | "daily",
            min_score_threshold: Number(setRes.data.min_score_threshold),
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const saveSettings = useCallback(async (next: Settings) => {
    if (!user) return;
    setSettings(next);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("spy_agent_settings").upsert({
        user_id: user.id,
        email_alerts_enabled: next.email_alerts_enabled,
        alert_frequency: next.alert_frequency,
        min_score_threshold: next.min_score_threshold,
      });
    } catch (e) {
      toast.error("No se pudieron guardar las preferencias.");
      console.error(e);
    }
  }, [user]);

  async function addAccount() {
    if (!user) return;
    const handle = newHandle.trim().replace(/^@/, "");
    if (!handle) { toast.error("Ingresá un @ válido."); return; }
    if (accounts.length >= MAX_ACCOUNTS) { toast.error("Llegaste al límite de 20 cuentas."); return; }
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.from("tracked_accounts").insert({
        user_id: user.id,
        handle,
        platform: newPlatform,
        display_name: handle,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(handle)}`,
      }).select().single();
      if (error) throw error;
      setAccounts((prev) => [data as TrackedAccount, ...prev]);
      setAddOpen(false); setNewHandle(""); setNewPlatform("instagram");
      toast.success("Cuenta agregada al Spy Agent.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error(msg.includes("duplicate") ? "Esa cuenta ya está siendo monitoreada." : "No se pudo agregar.");
    }
  }

  async function toggleActive(acc: TrackedAccount) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("tracked_accounts").update({ is_active: !acc.is_active }).eq("id", acc.id);
      setAccounts((prev) => prev.map((a) => a.id === acc.id ? { ...a, is_active: !a.is_active } : a));
    } catch (e) { console.error(e); }
  }

  async function removeAccount(id: string) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("tracked_accounts").delete().eq("id", id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) { console.error(e); }
  }

  function viewAnalysis(acc: TrackedAccount) {
    // Mock: tomamos el primer viral de un nicho dummy
    const v = getMockViralVideos(acc.handle, 1)[0];
    if (v) {
      setDrawerVideo({
        ...v,
        creatorName: acc.display_name || acc.handle,
        creatorHandle: `@${acc.handle}`,
        creatorAvatar: acc.avatar_url,
        platform: acc.platform,
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Spy Agent</h1>
          <p className="text-sm text-muted-foreground">
            Monitoreá creadores y enterate cuando alguno publica algo que rompe su promedio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{accounts.length}/{MAX_ACCOUNTS} cuentas</span>
          <Button onClick={() => setAddOpen(true)} disabled={accounts.length >= MAX_ACCOUNTS} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Agregar cuenta
          </Button>
        </div>
      </div>

      {/* Alertas */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          {settings.email_alerts_enabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
          <h3 className="text-sm font-semibold text-foreground">Configuración de alertas</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2">
            <Label className="text-xs">Alertas por email</Label>
            <Switch
              checked={settings.email_alerts_enabled}
              onCheckedChange={(v) => saveSettings({ ...settings, email_alerts_enabled: v })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Frecuencia</Label>
            <Select value={settings.alert_frequency} onValueChange={(v) => saveSettings({ ...settings, alert_frequency: v as "immediate" | "daily" })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Inmediata</SelectItem>
                <SelectItem value="daily">Resumen diario</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Umbral mínimo: {settings.min_score_threshold}x</Label>
            <Slider
              min={2} max={50} step={1}
              value={[settings.min_score_threshold]}
              onValueChange={([v]) => saveSettings({ ...settings, min_score_threshold: v })}
            />
          </div>
        </div>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Eye className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Todavía no agregaste cuentas</p>
          <p className="text-xs text-muted-foreground mt-1">Agregá hasta 20 creadores para monitorear sus virales.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {accounts.map((acc) => (
            <Card key={acc.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <img src={acc.avatar_url} alt={acc.handle} className="h-10 w-10 rounded-full object-cover bg-muted shrink-0" onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.handle)}&background=random`; }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{acc.display_name || acc.handle}</p>
                  <PlatformIcon platform={acc.platform} size={14} className="text-muted-foreground" />
                  {acc.detected_within_24h && (
                    <span className="rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold">
                      Viral detectado
                    </span>
                  )}
                  {acc.last_viral_thumbnail && (
                    <img
                      src={acc.last_viral_thumbnail}
                      alt="Último viral"
                      className="h-10 w-10 rounded-md object-cover border border-border"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">@{acc.handle}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {acc.last_viral_at ? (
                    <>Último viral: <ViralScoreBadge score={Number(acc.last_viral_score) || 0} className="ml-1" /></>
                  ) : "Sin virales recientes"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Switch checked={acc.is_active} onCheckedChange={() => toggleActive(acc)} />
                  <span className="text-[11px] text-muted-foreground">{acc.is_active ? "Activo" : "Pausado"}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => viewAnalysis(acc)}>Ver análisis</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeAccount(acc.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar cuenta a monitorear</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">@ de la cuenta</Label>
              <Input value={newHandle} onChange={(e) => setNewHandle(e.target.value)} placeholder="ej: garyvee" maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Red social</Label>
              <Select value={newPlatform} onValueChange={(v) => setNewPlatform(v as Platform)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
                    <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={addAccount}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ViralVideoDrawer video={drawerVideo} open={!!drawerVideo} onOpenChange={(o) => !o && setDrawerVideo(null)} />
    </div>
  );
}
