import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const MAX_TEXT_LENGTH = 5000;

export const Route = createFileRoute("/api/recreate-script")({
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

          // Rate limit: 10 req/min
          const serviceClient = createClient<Database>(
            supabaseUrl,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          );
          const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
          const { count } = await serviceClient
            .from("rate_limits")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("endpoint", "recreate-script")
            .gte("created_at", oneMinuteAgo);

          if ((count ?? 0) >= 10) {
            return Response.json(
              { error: "Hiciste demasiadas solicitudes. Esperá un momento e intentá de nuevo." },
              { status: 429 },
            );
          }
          await serviceClient.from("rate_limits").insert({
            user_id: user.id,
            endpoint: "recreate-script",
          });

          const body = await request.json();
          const mode: "question" | "generate" = body?.mode;
          const video = body?.video;

          if (!mode || !video || typeof video !== "object") {
            return Response.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
          }

          const transcriptText = String(video.transcript || "").slice(0, MAX_TEXT_LENGTH);
          const captionText = String(video.caption || "").slice(0, 500);
          const niche = String(video.niche || "contenido").slice(0, 80);
          const hook = String(video.hook || "").slice(0, 500);

          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return Response.json(
              { error: "Servicio mal configurado. Probá más tarde." },
              { status: 500 },
            );
          }

          if (mode === "question") {
            // Generamos una pregunta de adaptación + 3 opciones
            const systemPrompt = `Sos un estratega de contenido viral. El usuario quiere recrear un video viral para SU propio nicho.
Analizá el video original y devolvé UNA pregunta de adaptación clara y concreta + 3 opciones realistas adaptadas a nichos comunes (negocios, fitness, marketing, finanzas personales, etc.).
Hablá en español rioplatense neutral. Sé directo y específico.`;

            const userPrompt = `Video original:
- Caption: ${captionText}
- Hook: ${hook}
- Nicho del video: ${niche}
- Transcripción: ${transcriptText}

Devolveme la pregunta de adaptación y 3 opciones concretas.`;

            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.0-flash",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "return_adaptation_question",
                      description: "Devuelve una pregunta de adaptación con 3 opciones",
                      parameters: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          options: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 3,
                            maxItems: 3,
                          },
                        },
                        required: ["question", "options"],
                        additionalProperties: false,
                      },
                    },
                  },
                ],
                tool_choice: {
                  type: "function",
                  function: { name: "return_adaptation_question" },
                },
              }),
            });

            return await handleAiResponse(aiRes);
          }

          // mode === "generate"
          const userAdaptation = String(body?.userAdaptation || "").slice(0, 1000);
          if (!userAdaptation) {
            return Response.json(
              { error: "Falta la adaptación al nicho." },
              { status: 400 },
            );
          }

          const systemPrompt = `Sos un estratega de contenido viral. Tu tarea: reescribir un video viral para que sirva al nicho específico del usuario.
Reglas:
- Mantené EXACTAMENTE la misma estructura viral del original (mismo tipo de hook, mismos beats, misma duración aproximada).
- Cambiá TODOS los ejemplos, datos, referencias y vocabulario al nicho del usuario.
- Hablá en español rioplatense neutral, directo y conversacional.
- El hook debe enganchar en los primeros 3 segundos.
- El CTA debe ser claro y específico.
- Devolvé el script completo + un desglose por timestamps.`;

          const userPrompt = `Video original:
- Caption: ${captionText}
- Hook original: ${hook}
- Transcripción original: ${transcriptText}

Adaptación al nicho del usuario: ${userAdaptation}

Reescribí el video completo manteniendo la estructura viral.`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.0-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "return_recreated_script",
                    description: "Devuelve el script recreado",
                    parameters: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Título corto del video" },
                        hook: { type: "string", description: "Frase de hook del nuevo video" },
                        script: { type: "string", description: "Script completo en texto plano" },
                        structure: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              timestamp: { type: "string" },
                              label: { type: "string" },
                              text: { type: "string" },
                            },
                            required: ["timestamp", "label", "text"],
                            additionalProperties: false,
                          },
                          minItems: 3,
                          maxItems: 6,
                        },
                      },
                      required: ["title", "hook", "script", "structure"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: {
                type: "function",
                function: { name: "return_recreated_script" },
              },
            }),
          });

          return await handleAiResponse(aiRes);
        } catch (e) {
          console.error("recreate-script error:", e);
          return Response.json(
            { error: "Ocurrió un error inesperado. Probá de nuevo." },
            { status: 500 },
          );
        }
      },
    },
  },
});

async function handleAiResponse(response: Response): Promise<Response> {
  if (!response.ok) {
    if (response.status === 429) {
      return Response.json(
        { error: "Demasiadas solicitudes a la IA. Esperá un momento." },
        { status: 429 },
      );
    }
    if (response.status === 402) {
      return Response.json({ error: "Sin créditos de IA disponibles." }, { status: 402 });
    }
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    return Response.json({ error: "Error del servicio de IA." }, { status: 500 });
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    console.error("Respuesta inesperada de IA:", JSON.stringify(data));
    return Response.json({ error: "La IA devolvió una respuesta inesperada." }, { status: 500 });
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  return Response.json(parsed);
}
