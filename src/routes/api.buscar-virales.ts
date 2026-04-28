import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ViralVideo, Platform } from "@/lib/viral/types";

const CACHE_TTL_HOURS = 6;
const RATE_LIMIT = 20;

export const Route = createFileRoute("/api/buscar-virales")({
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
            .eq("endpoint", "buscar-virales")
            .gte("created_at", oneMinuteAgo);

          if ((count ?? 0) >= RATE_LIMIT) {
            return Response.json(
              { error: "Hiciste demasiadas búsquedas. Esperá un momento." },
              { status: 429 },
            );
          }
          await serviceClient.from("rate_limits").insert({
            user_id: user.id,
            endpoint: "buscar-virales",
          });

          const body = await request.json();
          const niche = String(body?.niche || "").trim().slice(0, 80);
          const platform = (String(body?.platform || "instagram") as Platform);

          if (!niche) {
            return Response.json({ error: "Falta el nicho." }, { status: 400 });
          }

          // 1) Buscar en cache
          const cacheCutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
          const { data: cached } = await (serviceClient.from("viral_cache" as any) as any)
            .select("data")
            .eq("niche", niche)
            .eq("platform", platform)
            .gte("created_at", cacheCutoff)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (cached && (cached as any).data) {
            return Response.json({ videos: (cached as any).data });
          }

          // 2) Llamar a Apify
          const APIFY_API_KEY = process.env.APIFY_API_KEY;
          if (!APIFY_API_KEY) {
            return Response.json(
              { error: "Servicio mal configurado. Probá más tarde." },
              { status: 500 },
            );
          }

          const hashtag = niche.replace(/\s+/g, "").toLowerCase();
          const apifyRes = await fetch(
            `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                hashtags: [hashtag],
                resultsLimit: 30,
                addParentData: true,
              }),
            },
          );

          if (!apifyRes.ok) {
            const errText = await apifyRes.text();
            console.error("Apify error:", apifyRes.status, errText);
            return Response.json(
              { error: "No pudimos buscar virales ahora. Probá de nuevo en un momento." },
              { status: 502 },
            );
          }

          const rawPosts: any[] = await apifyRes.json();
          if (!Array.isArray(rawPosts)) {
            return Response.json({ videos: [] });
          }

          const videos: ViralVideo[] = rawPosts
            .map((post: any): ViralVideo | null => {
              try {
                const views = post.videoPlayCount || (post.likesCount || 0) * 10 || 0;
                const followers = Math.max(post.ownerFollowersCount || 1000, 1);
                const viralScore = Math.min(
                  50,
                  Math.max(2, Math.round((views / followers) * 10)),
                );
                const captionStr = String(post.caption || "");
                return {
                  id: String(post.id || post.shortCode || crypto.randomUUID()),
                  platform: "instagram",
                  niche,
                  creatorName: String(post.ownerFullName || post.ownerUsername || "Desconocido"),
                  creatorHandle: "@" + String(post.ownerUsername || ""),
                  creatorAvatar: String(post.ownerProfilePicUrl || ""),
                  thumbnail: String(post.displayUrl || post.thumbnailUrl || ""),
                  caption: captionStr.slice(0, 300),
                  views,
                  likes: post.likesCount || 0,
                  comments: post.commentsCount || 0,
                  publishedAt: String(post.timestamp || new Date().toISOString()),
                  viralScore,
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

          // 3) Guardar en cache
          await serviceClient.from("viral_cache" as any).insert({
            niche,
            platform,
            data: videos as any,
          });

          return Response.json({ videos });
        } catch (e) {
          console.error("buscar-virales error:", e);
          return Response.json(
            { error: "Ocurrió un error inesperado. Probá de nuevo." },
            { status: 500 },
          );
        }
      },
    },
  },
});
