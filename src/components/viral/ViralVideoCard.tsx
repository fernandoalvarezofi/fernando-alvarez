import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PlatformIcon } from "./PlatformIcon";
import { ViralScoreBadge } from "./ViralScoreBadge";
import { Heart, Eye, MessageCircle, ImageOff } from "lucide-react";
import { formatCompact, type ViralVideo } from "@/lib/viral/types";

interface ViralVideoCardProps {
  video: ViralVideo;
  onClick: () => void;
}

export function ViralVideoCard({ video, onClick }: ViralVideoCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left active:scale-[0.99] transition-transform"
    >
      <Card className="overflow-hidden border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          <img
            src={video.thumbnail}
            alt={video.caption}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-md bg-background/90 backdrop-blur-sm text-foreground shadow-sm">
            <PlatformIcon platform={video.platform} size={14} />
          </div>
          <div className="absolute top-2 right-2">
            <ViralScoreBadge score={video.viralScore} className="shadow-sm" />
          </div>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={video.creatorAvatar}
              alt={video.creatorName}
              className="h-6 w-6 rounded-full bg-muted shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{video.creatorName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{video.creatorHandle}</p>
            </div>
          </div>
          <p className="text-xs text-foreground line-clamp-2 leading-relaxed min-h-[2.4em]">
            {video.caption}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" /> {formatCompact(video.views)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" /> {formatCompact(video.likes)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {formatCompact(video.comments)}
            </span>
          </div>
        </div>
      </Card>
    </button>
  );
}
