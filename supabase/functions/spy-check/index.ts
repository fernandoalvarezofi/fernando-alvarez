// Edge function: revisa cuentas trackeadas y dispara alertas cuando detecta nuevos virales.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APIFY_KEY = Deno.env.get("APIFY_API_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: accounts, error } = await supabase
    .from("tracked_accounts")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Error cargando cuentas:", error);
    return new Response("error", { status: 500 });
  }

  if (!accounts?.length) return new Response("no accounts", { status: 200 });

  // Pre-cargar emails de usuarios involucrados (admin API)
  const userIds = Array.from(new Set(accounts.map((a) => a.user_id)));
  const userEmails: Record<string, string> = {};
  for (const uid of userIds) {
    try {
      const { data } = await supabase.auth.admin.getUserById(uid);
      if (data?.user?.email) userEmails[uid] = data.user.email;
    } catch (e) {
      console.error("Error obteniendo email de", uid, e);
    }
  }

  for (const account of accounts) {
    try {
      // Llamada 1: perfil
      const profileRes = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [String(account.handle).replace("@", "")] }),
        },
      );
      const profileArr = await profileRes.json();
      const profile = Array.isArray(profileArr) ? profileArr[0] : null;
      if (!profile) continue;

      // Llamada 2: posts reales
      const postsRes = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?token=${APIFY_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: String(account.handle).replace("@", ""), resultsLimit: 10 }),
        },
      );
      const postsRaw = postsRes.ok ? await postsRes.json() : [];
      const posts: any[] = Array.isArray(postsRaw) ? postsRaw.filter((p: any) => p && (p.videoPlayCount || p.likesCount)) : [];
      if (!posts.length) continue;
      const avgViews =
        posts.reduce(
          (s: number, p: any) => s + (p.videoPlayCount || (p.likesCount || 0) * 8 || 0),
          0,
        ) / posts.length;

      const { data: settings } = await supabase
        .from("spy_agent_settings")
        .select("min_score_threshold, email_alerts_enabled")
        .eq("user_id", account.user_id)
        .maybeSingle();

      const threshold = Number(settings?.min_score_threshold ?? 5);
      const newVirals = posts.filter((p: any) => {
        const views = p.videoPlayCount || (p.likesCount || 0) * 8 || 0;
        return avgViews > 0 ? Math.round(views / avgViews) >= threshold : false;
      });

      if (!newVirals.length) continue;

      const top = newVirals[0];
      const topViews = top.videoPlayCount || (top.likesCount || 0) * 8 || 0;
      const topScore = avgViews > 0 ? Math.round(topViews / avgViews) : 0;

      await supabase
        .from("tracked_accounts")
        .update({
          last_viral_at: new Date().toISOString(),
          last_viral_score: topScore,
          last_viral_thumbnail: top.displayUrl || "",
          detected_within_24h: true,
        })
        .eq("id", account.id);

      const userEmail = userEmails[account.user_id];
      if (settings?.email_alerts_enabled && userEmail && RESEND_KEY) {
        const cleanHandle = String(account.handle).replace("@", "");
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "alertas@tudominio.com",
            to: [userEmail],
            subject: `🚨 Nuevo viral detectado: @${cleanHandle}`,
            html: `
              <h2>Spy Agent detectó un viral</h2>
              <p><strong>@${cleanHandle}</strong> superó su promedio <strong>${topScore}x</strong>.</p>
              <p>Views: ${topViews.toLocaleString()}</p>
              <p><a href="https://instagram.com/${cleanHandle}">Ver perfil →</a></p>
            `,
          }),
        });
      }
    } catch (e) {
      console.error(`Error procesando ${account.handle}:`, e);
    }
  }

  return new Response("done", { status: 200 });
});
