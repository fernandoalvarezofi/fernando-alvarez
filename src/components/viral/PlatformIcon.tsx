import type { Platform } from "@/lib/viral/types";
import { Instagram, Linkedin, Facebook } from "lucide-react";
import type { LucideProps } from "lucide-react";

// Icono custom para X (Twitter), ya que lucide aún muestra el viejo Twitter
function XLogo(props: LucideProps) {
  const { size = 16, className, color } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color || "currentColor"}
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface PlatformIconProps {
  platform: Platform;
  size?: number;
  className?: string;
}

export function PlatformIcon({ platform, size = 16, className }: PlatformIconProps) {
  switch (platform) {
    case "instagram":
      return <Instagram size={size} className={className} />;
    case "linkedin":
      return <Linkedin size={size} className={className} />;
    case "x":
      return <XLogo size={size} className={className} />;
    case "facebook":
      return <Facebook size={size} className={className} />;
  }
}
