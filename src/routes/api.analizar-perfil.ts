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

          const apifyRes = await fetch(
            `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usernames: [cleanHandle], resultsLimit: 20 }),
            },
          );

          if (!apifyRes.ok) {
            const errText = await apifyRes.text();
            console.error("Apify error:", apifyRes.status, errText);
            return Response.json(
              { error: "No pudimos analizar este perfil ahora. Probá de nuevo." },
              { status: 502 },
            );
          }

          const profilesArr: any[] = await apifyRes.json();
          const profile = Array.isArray(profilesArr) ? profilesArr[0] : null;

          if (!profile || profile.error) {
            return Response.json(
              { error: "No encontramos ese perfil. Verificá el handle." },
              { status: 404 },
            );
          }

          const posts: any[] = Array.isArray(profile.latestPosts) ? profile.latestPosts : [];

          // Calcular promedio de views
          const viewsArr = posts.map(
            (p: any) => p.videoPlayCount || (p.likesCount || 0) * 8 || 0,
          );
          const totalViews = viewsArr.reduce((s, v) => s + v, 0);
          const averageViews = viewsArr.length > 0 ? Math.round(totalViews / viewsArr.length) : 0;

          // Mapear a videos virales (score >= 3 frente al promedio)
          const videos: ViralVideo[] = posts
            .map((p: any, idx: number): ViralVideo | null => {
              try {
                const views = p.videoPlayCount || (p.likesCount || 0) * 8 || 0;
                const score =
                  averageViews > 0
                    ? Math.min(50, Math.max(1, Math.round(views / averageViews)))
                    : 1;
                const captionStr = String(p.caption || "");
                return {
                  id: String(p.id || p.shortCode || `post-${idx}`),
                  platform: "instagram",
                  niche: "perfil",
                  creatorName: String(profile.fullName || profile.username || cleanHandle),
                  creatorHandle: "@" + String(profile.username || cleanHandle),
                  creatorAvatar: String(profile.profilePicUrlHD || profile.profilePicUrl || ""),
                  thumbnail: String(p.displayUrl || p.thumbnailUrl || ""),
                  caption: captionStr.slice(0, 300),
                  views,
                  likes: p.likesCount || 0,
                  comments: p.commentsCount || 0,
                  publishedAt: String(p.timestamp || new Date().toISOString()),
                  viralScore: score,
                  transcript: "",
                  hookAnalysis: {
                    text: captionStr.split(".")[0].slice(0, 100),
                    why: "Analizado por IA",
                  },
                  structure: [],
                  triggers: [],
                };
              } catch {
                return null;
              }
            })
            .filter((v): v is ViralVideo => v !== null && v.viralScore >= 3);

          const history = viewsArr
            .slice()
            .reverse()
            .map((views, index) => ({ index: index + 1, views }));

          const result: ProfileAnalysis = {
            handle: cleanHandle,
            platform,
            displayName: String(profile.fullName || profile.username || cleanHandle),
            avatar: String(profile.profilePicUrlHD || profile.profilePicUrl || ""),
            followers: Number(profile.followersCount || 0),
            following: Number(profile.followsCount || 0),
            posts: Number(profile.postsCount || posts.length || 0),
            history,
            averageViews,
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
