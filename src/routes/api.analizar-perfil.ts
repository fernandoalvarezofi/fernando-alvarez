import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ProfileAnalysis, ViralVideo, Platform } from "@/lib/viral/types";

const RATE_LIMIT = 5;

export const Route = createFileRoute("/api/analizar-perfil")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204 }),

      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("Authorization");
          if (!authHeader) {
            return Response.json({ error: "Falta el header de autorización." }, { status: 401 });
          }

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
          });

          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError || !user) {
            return Response.json(
              { error: "Sesión inválida o expirada. Iniciá sesión de nuevo." },
              { status: 401 },
            );
          }

          const serviceClient = createClient<Database>(
            supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          );

          // Rate limit
          const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
          const { count } = await serviceClient
            .from("rate_limits")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("endpoint", "analizar-perfil")
            .gte("created_at", oneMinuteAgo);

          if ((count ?? 0) >= RATE_LIMIT) {
            return Response.json(
              { error: "Hiciste demasiados análisis. Esperá un momento." },
              { status: 429 },
            );
          }
          await serviceClient.from("rate_limits").insert({
            user_id: user.id,
            endpoint: "analizar-perfil",
          });

          const body = await request.json();
          const handleRaw = String(body?.handle || "").trim().slice(0, 80);
          const platform = (String(body?.platform || "instagram") as Platform);

          if (!handleRaw) {
            return Response.json({ error: "Falta el handle." }, { status: 400 });
          }

          const APIFY_API_KEY = process.env.APIFY_API_KEY;
          if (!APIFY_API_KEY) {
            return Response.json(
              { error: "Servicio mal configurado. Probá más tarde." },
              { status: 500 },
            );
          }

          const cleanHandle = handleRaw.replace("@", "").trim();

          // Llamada 1: datos del perfil
          const profileRes = await fetch(
            `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}&timeout=30`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usernames: [cleanHandle] }),
            },
          );

          if (!profileRes.ok) {
            const errText = await profileRes.text();
            console.error("Apify profile error:", profileRes.status, errText);
            return Response.json(
              { error: "No pudimos analizar este perfil ahora. Probá de nuevo." },
              { status: 502 },
            );
          }

          const profilesArr: any[] = await profileRes.json();
          const profileData = Array.isArray(profilesArr) ? profilesArr[0] : null;

          if (!profileData || profileData.error) {
            return Response.json(
              { error: "Perfil no encontrado" },
              { status: 404 },
            );
          }

          // Llamada 2: posts reales
          const postsRes = await fetch(
            `https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}&timeout=60`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: [cleanHandle], resultsLimit: 12 }),
            },
          );

          const postsRaw: any = postsRes.ok ? await postsRes.json() : [];
          const validPosts = Array.isArray(postsRaw)
            ? postsRaw.filter((p: any) => p && (p.videoPlayCount || p.likesCount))
            : [];

          const avgViews = validPosts.length > 0
            ? validPosts.reduce(
                (s: number, p: any) => s + (p.videoPlayCount || (p.likesCount || 0) * 8 || 0),
                0,
              ) / validPosts.length
            : 0;

          const videos: ViralVideo[] = validPosts.map((p: any, i: number) => {
            const views = p.videoPlayCount || (p.likesCount || 0) * 8 || 0;
            const viralScore = avgViews > 10
              ? Math.round((views / avgViews) * 10) / 10
              : views > 1000 ? 2 : 1;
            const captionStr = String(p.caption || "");
            return {
              id: String(p.id || p.shortCode || i),
              platform: "instagram",
              niche: cleanHandle,
              creatorName: String(profileData.fullName || cleanHandle),
              creatorHandle: "@" + cleanHandle,
              creatorAvatar: "",
              thumbnail: String(p.displayUrl || p.thumbnailUrl || ""),
              caption: captionStr.slice(0, 300),
              views,
              likes: p.likesCount || 0,
              comments: p.commentsCount || 0,
              publishedAt: String(p.timestamp || new Date().toISOString()),
              viralScore,
              transcript: "",
              hookAnalysis: {
                text: captionStr.split(".")[0].slice(0, 100),
                why: "Analizado por IA",
              },
              structure: [],
              triggers: [],
            };
          });

          const history = validPosts.map((p: any, i: number) => ({
            index: i + 1,
            views: p.videoPlayCount || (p.likesCount || 0) * 8 || 0,
          }));

          const result: ProfileAnalysis = {
            handle: cleanHandle,
            platform,
            displayName: String(profileData.fullName || cleanHandle),
            avatar: "",
            followers: Number(profileData.followersCount || 0),
            following: Number(profileData.followsCount || 0),
            posts: Number(profileData.postsCount || 0),
            history,
            averageViews: Math.round(avgViews),
            videos,
          };

          return Response.json(result);
        } catch (e) {
          console.error("analizar-perfil error:", e);
          return Response.json(
            { error: "Ocurrió un error inesperado. Probá de nuevo." },
            { status: 500 },
          );
        }
      },
    },
  },
});
