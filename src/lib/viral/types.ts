// Tipos compartidos del módulo Inteligencia Viral

export type Platform = "instagram" | "linkedin" | "x" | "facebook";

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
  facebook: "Facebook",
};

export interface ViralVideo {
  id: string;
  platform: Platform;
  niche: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  thumbnail: string;
  caption: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string; // ISO
  /** Multiplicador respecto al promedio del perfil (ej: 12 = 12x) */
  viralScore: number;
  transcript: string;
  hookAnalysis: {
    text: string; // qué dice
    why: string;  // por qué funciona
  };
  structure: Array<{
    timestamp: string; // "0:00"
    label: string;     // "Hook" | "Contexto" | ...
    description: string;
  }>;
  triggers: string[]; // disparadores psicológicos
}

export interface NicheSuggestion {
  key: string;
  label: string;
}

export const SUGGESTED_NICHES: NicheSuggestion[] = [
  { key: "marketing-digital", label: "Marketing Digital" },
  { key: "fitness", label: "Fitness" },
  { key: "trading", label: "Trading" },
  { key: "copywriting", label: "Copywriting" },
  { key: "ventas", label: "Ventas B2B" },
  { key: "infoproductos", label: "Infoproductos" },
  { key: "emprendimiento", label: "Emprendimiento" },
  { key: "productividad", label: "Productividad" },
];

export type ScoreTier = "low" | "medium" | "high";

export function getScoreTier(score: number): ScoreTier {
  if (score >= 20) return "high";
  if (score >= 10) return "medium";
  return "low";
}

export function getScoreTierClasses(tier: ScoreTier): string {
  // Usamos las mismas clases visuales del sistema (badges existentes), variando opacidad/saturación
  switch (tier) {
    case "high":
      return "bg-primary text-primary-foreground";
    case "medium":
      return "bg-primary/15 text-primary border border-primary/30";
    case "low":
      return "bg-muted text-muted-foreground border border-border";
  }
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

export interface ProfileAnalysis {
  handle: string;
  platform: Platform;
  displayName: string;
  avatar: string;
  followers: number;
  following: number;
  posts: number;
  history: Array<{ index: number; views: number }>;
  averageViews: number;
  videos: ViralVideo[];
}
