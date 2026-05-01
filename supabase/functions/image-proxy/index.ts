Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("url");

    if (!imageUrl) {
      return new Response("Falta el parametro url", { status: 400, headers: corsHeaders });
    }

    const allowed = ["instagram.com", "cdninstagram.com", "fbcdn.net", "scontent"];
    const isAllowed = allowed.some((domain) => imageUrl.includes(domain));
    if (!isAllowed) {
      return new Response("URL no permitida", { status: 403, headers: corsHeaders });
    }

    const imageRes = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
        "Referer": "https://www.instagram.com/",
      },
    });

    if (!imageRes.ok) {
      return new Response("No se pudo obtener la imagen", {
        status: imageRes.status,
        headers: corsHeaders,
      });
    }

    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    const imageData = await imageRes.arrayBuffer();

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("image-proxy error:", e);
    return new Response("Error interno", { status: 500, headers: corsHeaders });
  }
});
