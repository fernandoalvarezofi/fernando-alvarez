import { getScoreTier, getScoreTierClasses } from "@/lib/viral/types";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface ViralScoreBadgeProps {
  score: number;
  className?: string;
  showIcon?: boolean;
}

export function ViralScoreBadge({ score, className, showIcon = true }: ViralScoreBadgeProps) {
  const tier = getScoreTier(score);
  const tierClasses = getScoreTierClasses(tier);
  const display = `${score % 1 === 0 ? score : score.toFixed(1)}x`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
        tierClasses,
        className,
      )}
      title={`Score viral: ${display}`}
    >
      {showIcon && <TrendingUp className="h-3 w-3" strokeWidth={2.5} />}
      {display}
    </span>
  );
}
