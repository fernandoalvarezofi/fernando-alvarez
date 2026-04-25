// Datos mock para Inteligencia Viral. Estructurados como respondería una API real.
import type { ViralVideo, Platform, ProfileAnalysis } from "./types";

const NICHE_TEMPLATES: Record<string, Array<Partial<ViralVideo> & { caption: string; transcript: string }>> = {
  "marketing-digital": [
    {
      caption: "El hack de copywriting que convirtió 3x más en mi última campaña",
      transcript:
        "Si estás corriendo ads y no convierten, es porque te estás enfocando en el producto. Hoy te muestro cómo cambiar el ángulo del mensaje en 30 segundos para hablarle directo al deseo del cliente. Paso 1: identificá la frustración real. Paso 2: escribí el hook desde esa frustración, no desde el feature. Paso 3: cerrá con la promesa de transformación. Probalo en tu próximo anuncio.",
      hookAnalysis: {
        text: "Si estás corriendo ads y no convierten, es porque te estás enfocando en el producto.",
        why: "Acusa con confianza el error más común de la audiencia, generando una pausa cognitiva inmediata.",
      },
      triggers: ["Curiosidad", "Identidad profesional", "Promesa de resultado"],
    },
    {
      caption: "Por qué el 90% de los embudos no funcionan",
      transcript:
        "El problema no es tu oferta, es el orden. La mayoría arma el embudo desde el lead magnet hacia adelante. Yo lo armo al revés: primero defino la transformación, después la oferta, después el contenido. Te muestro mi plantilla.",
      hookAnalysis: {
        text: "Por qué el 90% de los embudos no funcionan",
        why: "Estadística específica + contraintuitiva. Activa el sesgo de querer estar en el 10% restante.",
      },
      triggers: ["FOMO", "Autoridad", "Pertenecer a una élite"],
    },
  ],
  "fitness": [
    {
      caption: "El error #1 en sentadillas que arruina tus rodillas",
      transcript:
        "Si te duelen las rodillas al hacer sentadillas no es por debilidad, es por activación. Mirá. La rodilla no debería ir hacia adentro. La cadera no debería bloquearse. Y los pies tienen que estar a 30 grados. Cambiá esto y tu progreso se duplica en una semana.",
      hookAnalysis: {
        text: "El error #1 en sentadillas que arruina tus rodillas",
        why: "Promesa de evitar dolor + jerarquía clara (#1) que reduce la fricción del consumo.",
      },
      triggers: ["Miedo a lesión", "Promesa de mejora rápida", "Autoridad técnica"],
    },
  ],
  "ventas": [
    {
      caption: "La pregunta de cierre que duplica mi tasa de conversión",
      transcript:
        "Cuando un prospecto te dice 'lo voy a pensar', no le respondas con un descuento. Hacele esta pregunta: '¿Qué tendría que pasar para que esto sea una decisión obvia?'. Calla. Y dejá que él te dé la objeción real.",
      hookAnalysis: {
        text: "La pregunta de cierre que duplica mi tasa de conversión",
        why: "Específico (duplica), accionable (una pregunta) y con autoridad personal.",
      },
      triggers: ["Curiosidad", "Resultado medible", "Aplicación inmediata"],
    },
  ],
};

const DEFAULT_TEMPLATE: Array<Partial<ViralVideo> & { caption: string; transcript: string }> = [
  {
    caption: "Lo que nadie te cuenta sobre crecer en este nicho",
    transcript:
      "Llevo años en esto y aprendí algo que cambia todo. La gente cree que el éxito es contenido, pero el verdadero apalancamiento es la consistencia con sistema. Mirá cómo lo hago yo en 3 pasos.",
    hookAnalysis: {
      text: "Lo que nadie te cuenta sobre crecer en este nicho",
      why: "Insinúa información secreta y combate la sensación de que ya se sabe todo.",
    },
    triggers: ["Curiosidad", "Secreto revelado", "Autoridad por experiencia"],
  },
];

const STRUCTURE_TEMPLATE: ViralVideo["structure"] = [
  { timestamp: "0:00", label: "Hook", description: "Pregunta o afirmación que engancha en los primeros segundos." },
  { timestamp: "0:05", label: "Contexto", description: "Identifica el problema específico que vive el espectador." },
  { timestamp: "0:15", label: "Desarrollo", description: "Promesa o solución concreta con autoridad." },
  { timestamp: "0:45", label: "CTA", description: "Llamada a la acción final, cierre claro." },
];

const PLATFORMS: Platform[] = ["instagram", "linkedin", "x", "facebook"];

function thumbnailFor(platform: Platform, seed: string): string {
  // Usamos picsum.photos como placeholder estable basado en seed
  const s = encodeURIComponent(`${platform}-${seed}`);
  return `https://picsum.photos/seed/${s}/640/640`;
}

function avatarFor(name: string): string {
  // Avatar placeholder vía servicio público (sin API key)
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=cce6ff,e0eaff,d6eaff`;
}

function rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pickNicheTemplates(niche: string) {
  const key = niche.toLowerCase().replace(/\s+/g, "-");
  return NICHE_TEMPLATES[key] || DEFAULT_TEMPLATE;
}

const CREATORS = [
  "Lucía Méndez", "Tomás Ríos", "Camila Vega", "Mateo Suárez", "Valentina Cruz",
  "Joaquín Pereira", "Sofía Acosta", "Bruno Castillo", "Martina Romero", "Diego Alfaro",
  "Renata Salinas", "Felipe Ortega", "Catalina Reyes", "Sebastián Núñez",
];

export function getMockViralVideos(niche: string, count = 12): ViralVideo[] {
  const templates = pickNicheTemplates(niche);
  const r = rand(niche.length * 1000 + 7);
  const videos: ViralVideo[] = [];

  for (let i = 0; i < count; i++) {
    const t = templates[i % templates.length];
    const platform = PLATFORMS[Math.floor(r() * PLATFORMS.length)];
    const creatorName = CREATORS[(i * 3 + niche.length) % CREATORS.length];
    const handle = creatorName.toLowerCase().replace(/\s+/g, ".").replace(/[áéíóú]/g, (c) => "aeiou"["áéíóú".indexOf(c)]);
    const avgViews = 5_000 + Math.floor(r() * 30_000);
    const score = +(3 + r() * 25).toFixed(1);
    const views = Math.floor(avgViews * score);
    const likes = Math.floor(views * (0.04 + r() * 0.08));
    const comments = Math.floor(likes * (0.05 + r() * 0.1));

    videos.push({
      id: `${niche}-${i}-${platform}`,
      platform,
      niche,
      creatorName,
      creatorHandle: `@${handle}`,
      creatorAvatar: avatarFor(creatorName),
      thumbnail: thumbnailFor(platform, `${niche}-${i}`),
      caption: t.caption,
      views,
      likes,
      comments,
      publishedAt: new Date(Date.now() - Math.floor(r() * 30) * 24 * 3600 * 1000).toISOString(),
      viralScore: score,
      transcript: t.transcript,
      hookAnalysis: t.hookAnalysis as ViralVideo["hookAnalysis"],
      structure: STRUCTURE_TEMPLATE,
      triggers: (t.triggers as string[]) || ["Curiosidad", "Autoridad"],
    });
  }

  // Ordenamos por score descendente
  return videos.sort((a, b) => b.viralScore - a.viralScore);
}

export function getMockProfileAnalysis(handle: string, platform: Platform): ProfileAnalysis {
  const cleanHandle = handle.replace(/^@/, "");
  const displayName = cleanHandle
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
  const r = rand(cleanHandle.length * 100 + platform.length);
  const averageViews = 4_000 + Math.floor(r() * 20_000);

  const history = Array.from({ length: 25 }, (_, i) => {
    const variance = 0.4 + r() * 1.2;
    const isViral = r() < 0.2;
    return {
      index: i + 1,
      views: Math.floor(averageViews * (isViral ? variance * 5 : variance)),
    };
  });

  // Generamos videos basados en el historial: marcamos los virales (>= 3x avg)
  const videos: ViralVideo[] = history
    .filter((h) => h.views >= averageViews * 3)
    .map((h, i) => {
      const score = +(h.views / averageViews).toFixed(1);
      const baseNiche = "contenido";
      const t = DEFAULT_TEMPLATE[0];
      return {
        id: `${cleanHandle}-${i}`,
        platform,
        niche: baseNiche,
        creatorName: displayName,
        creatorHandle: `@${cleanHandle}`,
        creatorAvatar: avatarFor(displayName),
        thumbnail: thumbnailFor(platform, `${cleanHandle}-${i}`),
        caption: t.caption,
        views: h.views,
        likes: Math.floor(h.views * 0.07),
        comments: Math.floor(h.views * 0.01),
        publishedAt: new Date(Date.now() - i * 5 * 24 * 3600 * 1000).toISOString(),
        viralScore: score,
        transcript: t.transcript,
        hookAnalysis: t.hookAnalysis as ViralVideo["hookAnalysis"],
        structure: STRUCTURE_TEMPLATE,
        triggers: t.triggers as string[],
      };
    })
    .sort((a, b) => b.viralScore - a.viralScore);

  return {
    handle: cleanHandle,
    platform,
    displayName,
    avatar: avatarFor(displayName),
    followers: 5_000 + Math.floor(r() * 100_000),
    following: 100 + Math.floor(r() * 800),
    posts: history.length + Math.floor(r() * 200),
    history,
    averageViews,
    videos,
  };
}
