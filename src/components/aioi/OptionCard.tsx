import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface OptionCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  index?: number;
  selected?: boolean;
  title: string;
  description?: string;
}

export const OptionCard = forwardRef<HTMLButtonElement, OptionCardProps>(
  ({ index, selected, title, description, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "group relative w-full text-left rounded-lg border bg-surface-1/60 backdrop-blur-sm",
        "px-4 sm:px-5 py-4 sm:py-4 min-h-[56px] transition-all duration-200 motion-tap",
        "hover:border-brass/60 hover:bg-surface-2/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-walnut",
        selected ? "border-brass bg-surface-2 shadow-[0_0_0_1px_hsl(var(--brass)/0.6)]" : "border-cream/10",
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-4">
        {typeof index === "number" && (
          <span className="font-mono text-xs text-brass-bright/80 mt-0.5 w-6 shrink-0">{index}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg sm:text-xl text-cream leading-snug">{title}</p>
          {description && (
            <p className="mt-1 text-[13px] sm:text-sm text-cream/60 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </button>
  ),
);
OptionCard.displayName = "OptionCard";
