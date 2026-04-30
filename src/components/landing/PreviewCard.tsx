import {
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ThumbsUp,
  Send,
  Repeat,
} from "lucide-react";
import landingAvatar from "@/assets/fer-struzzi.jpg";
import previewInstagram from "@/assets/preview-instagram.jpg";
import previewLinkedin from "@/assets/preview-linkedin.jpg";
import previewX from "@/assets/preview-x.jpg";
import previewFacebook from "@/assets/preview-facebook.jpg";

type Platform = "instagram" | "linkedin" | "x" | "facebook";

const platformImages: Record<Platform, string> = {
  instagram: previewInstagram,
  linkedin: previewLinkedin,
  x: previewX,
  facebook: previewFacebook,
};

const platformMeta = {
  instagram: { icon: Instagram, name: "Instagram", color: "text-pink-500" },
  linkedin: { icon: Linkedin, name: "LinkedIn", color: "text-blue-700" },
  x: { icon: Twitter, name: "X", color: "text-foreground" },
  facebook: { icon: Facebook, name: "Facebook", color: "text-blue-600" },
};

const platformContent = {
  instagram: {
    displayName: "Fer Struzzi",
    handle: "ferstruzzi",
    text: "Acabo de lanzar algo increíble 🚀 Probá WOREF — previsualizá tus posts en todas las plataformas antes de publicar. Sin más adivinanzas!",
    dims: "1080×1080",
  },
  linkedin: {
    displayName: "Fer Struzzi",
    handle: "Content Strategist · 2h",
    text: "Emocionado de anunciar WOREF — la herramienta de previsualización precisa para equipos de marketing modernos. Mirá exactamente cómo se ve tu contenido en Instagram, X, LinkedIn y Facebook.",
    dims: "1200×1200",
  },
  x: {
    displayName: "Fer Struzzi",
    handle: "@ferstruzzi · 3h",
    text: "Tu post se ve distinto en cada plataforma.\n\nWOREF lo soluciona.\n\nPrevisualizá en Instagram, LinkedIn, X y Facebook — en tiempo real. ✨",
    dims: "1080×1080",
  },
  facebook: {
    displayName: "Fer Struzzi",
    handle: "Just now · 🌐",
    text: "Dejá de adivinar cómo se van a ver tus posts. WOREF te da previews pixel-perfect en todas las plataformas principales. Probalo gratis en woref.com 🎯",
    dims: "1080×1080",
  },
};

export function PreviewCard({ platform }: { platform: Platform }) {
  const meta = platformMeta[platform];
  const content = platformContent[platform];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col min-h-[280px]">
      {/* Platform header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card">
        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
        <span className="text-xs font-medium text-foreground">{meta.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono tabular-nums">
          {content.dims}
        </span>
      </div>

      {/* Post content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* User info */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            <img src={landingAvatar} alt="Fer Struzzi" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">
              {content.displayName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {content.handle}
            </p>
          </div>
        </div>

        {/* Post text */}
        <p className="text-xs text-foreground leading-relaxed flex-1 whitespace-pre-line">
          {platform === "instagram" && content.text.length > 125
            ? content.text.slice(0, 125) + "… more"
            : content.text}
        </p>

        {/* Post image */}
        <div className="mt-3 rounded-lg overflow-hidden border border-border">
          <img
            src={platformImages[platform]}
            alt={`${meta.name} preview`}
            className="w-full aspect-square object-cover"
            loading="lazy"
          />
        </div>

        {/* Platform-specific engagement bar */}
        <div className="mt-3 pt-2.5 border-t border-border">
          {platform === "instagram" && (
            <div className="flex items-center gap-4">
              <Heart className="h-3.5 w-3.5 text-muted-foreground" />
              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <Send className="h-3.5 w-3.5 text-muted-foreground" />
              <Bookmark className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            </div>
          )}
          {platform === "linkedin" && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground overflow-hidden">
              <span className="flex items-center gap-1 shrink-0"><ThumbsUp className="h-3 w-3" /> Like</span>
              <span className="flex items-center gap-1 shrink-0"><MessageCircle className="h-3 w-3" /> Comment</span>
              <span className="flex items-center gap-1 shrink-0"><Repeat className="h-3 w-3" /> Repost</span>
              <span className="flex items-center gap-1 shrink-0"><Send className="h-3 w-3" /> Send</span>
            </div>
          )}
          {platform === "x" && (
            <div className="flex items-center gap-5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> 89</span>
              <span className="flex items-center gap-1"><Repeat className="h-3 w-3" /> 247</span>
              <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> 1.2K</span>
              <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /></span>
            </div>
          )}
          {platform === "facebook" && (
            <div className="flex items-center gap-5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> Like</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> Comment</span>
              <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> Share</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
