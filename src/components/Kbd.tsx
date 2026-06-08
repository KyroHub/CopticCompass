import { cx } from "@/lib/classes";

import type { HTMLAttributes } from "react";

type KbdVariant = "default" | "inverse" | "ghost";

type KbdProps = HTMLAttributes<HTMLElement> & {
  variant?: KbdVariant;
};

const VARIANT_CLASSES: Record<KbdVariant, string> = {
  default: "text-muted bg-elevated border-line",
  inverse: "text-paper/85 bg-paper/20 border-paper/10",
  ghost: "opacity-75 border-current bg-surface/10",
};

export function Kbd({ className, variant = "default", ...props }: KbdProps) {
  return (
    <kbd
      className={cx(
        "inline-flex items-center justify-center rounded border px-1.5 py-0.5 font-sans text-[10px] font-semibold shadow-sm",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
