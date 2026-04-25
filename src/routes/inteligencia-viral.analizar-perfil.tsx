import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";
import { ViralVideoCard } from "@/components/viral/ViralVideoCard";
import { ViralVideoDrawer } from "@/components/viral/ViralVideoDrawer";
import { PlatformIcon } from "@/components/viral/PlatformIcon";
import { PLATFORM_LABELS, formatCompact, type Platform, type ProfileAnalysis, type ViralVideo } from "@/lib/viral/types";
import { getMockProfileAnalysis } from "@/lib/viral/mockData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/inteligencia-viral/analizar-perfil")({
  component: AnalizarPerfilPage,
});

function AnalizarPerfilPage() {
  const { user } = useAuth();
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileAnalysis | null>(null);
  const [selected, setSelected] = useState<ViralVideo | null>(null);

  function analyze() {
    if (!handle.trim()) return;
    setLoading(true);
    setProfile(null);
    setTimeout(() => {
      setProfile(getMockProfileAnalysis(handle, platform));
      setLoading(false);
    }, 700);
  }

  async function addToSpy() {
    if (!profile || !user) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("tracked_accounts").insert({
        user_id: user.id,
        handle: profile.handle,
        platform: profile.platform,
        display_name: profile.displayName,
        avatar_url: profile.avatar,
      });
      if (error) {
        toast.error(error.message.includes("duplicate") ? "Ya estás monitoreando esta cuenta." : "No se pudo agregar.");
      } else {
        toast.success("Cuenta agregada al Spy Agent.");
      }
    } catch (e) { console.error(e); }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analizador de perfiles</h1>
        <p className="text-sm text-muted-foreground">
          Analizá el rendimiento de cualquier cuenta pública y descubrí qué la hace funcionar.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); analyze(); }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <Input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Ingresá el @ de una cuenta"
          maxLength={50}
          className="flex-1 h-10"
        />
        <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
          <SelectTrigger className="h-10 sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
              <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="h-10 gap-1.5"><Search className="h-4 w-4" /> Analizar</Button>
      </form>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {profile && !loading && (
        <div className="space-y-6">
          {/* Header del perfil */}
          <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <img src={profile.avatar} alt={profile.displayName} className="h-16 w-16 rounded-full bg-muted" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground truncate">{profile.displayName}</h2>
                <PlatformIcon platform={profile.platform} size={16} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">@{profile.handle}</p>
              <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                <span><strong className="text-foreground">{formatCompact(profile.posts)}</strong> posts</span>
                <span><strong className="text-foreground">{formatCompact(profile.followers)}</strong> seguidores</span>
                <span><strong className="text-foreground">{formatCompact(profile.following)}</strong> seguidos</span>
              </div>
            </div>
            <Button variant="outline" onClick={addToSpy} className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Agregar al Spy Agent
            </Button>
          </Card>

          {/* Gráfico */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Rendimiento histórico (últimos {profile.history.length} videos)</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profile.history}>
                  <XAxis dataKey="index" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => formatCompact(v)}
                  />
                  <ReferenceLine y={profile.averageViews} stroke="var(--muted-foreground)" strokeDasharray="3 3" label={{ value: "Promedio", fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Line type="monotone" dataKey="views" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Promedio: <strong className="text-foreground">{formatCompact(profile.averageViews)}</strong> vistas. Los picos por encima son virales.
            </p>
          </Card>

          {/* Videos virales */}
          {profile.videos.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Videos virales detectados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {profile.videos.map((v) => (
                  <ViralVideoCard key={v.id} video={v} onClick={() => setSelected(v)} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Esta cuenta no tiene videos que superen significativamente su promedio.
            </p>
          )}
        </div>
      )}

      <ViralVideoDrawer video={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
