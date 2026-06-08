import { cx } from "@/lib/classes";

import type { ReactNode } from "react";

type BadgeTone =
  | "accent"
  | "brand"
  | "coptic"
  | "danger"
  | "flat"
  | "info"
  | "language"
  | "neutral"
  | "success"
  | "surface"
  | "warning";
type BadgeSize = "xxs" | "xs" | "sm" | "md";

type BadgeProps = {
  caps?: boolean;
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
  size?: BadgeSize;
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  accent:
    "border border-[rgb(var(--accent)/0.18)] bg-[rgb(var(--accent-soft)/0.78)] text-[rgb(var(--accent-strong))]",
  brand:
    "border border-[rgb(var(--accent)/0.18)] bg-[rgb(var(--accent-soft)/0.78)] text-[rgb(var(--accent-strong))]",
  coptic:
    "border border-[rgb(var(--coptic)/0.18)] bg-[rgb(var(--coptic-soft)/0.78)] text-[rgb(var(--coptic))]",
  danger:
    "border border-[rgb(var(--danger)/0.18)] bg-[rgb(var(--danger)/0.08)] text-[rgb(var(--danger))]",
  flat: "bg-[rgb(var(--line))] text-[rgb(var(--muted))]",
  info: "border border-[rgb(var(--accent)/0.18)] bg-[rgb(var(--accent-soft)/0.78)] text-[rgb(var(--accent-strong))]",
  language:
    "border border-[rgb(var(--coptic)/0.18)] bg-[rgb(var(--coptic-soft)/0.78)] text-[rgb(var(--coptic))]",
  neutral:
    "border border-[rgb(var(--line))] bg-[rgb(var(--elevated))] text-[rgb(var(--muted))]",
  success:
    "border border-[rgb(var(--success)/0.18)] bg-[rgb(var(--success)/0.08)] text-[rgb(var(--success))]",
  surface:
    "border border-[rgb(var(--line))] bg-[rgb(var(--surface)/0.72)] text-[rgb(var(--muted))] shadow-sm backdrop-blur-md",
  warning:
    "border border-[rgb(var(--warning)/0.18)] bg-[rgb(var(--accent-soft)/0.78)] text-[rgb(var(--accent-strong))]",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xxs: "px-2 py-0.5 text-[10px]",
  xs: "px-3 py-1 text-xs",
  sm: "px-3.5 py-2 text-sm",
  md: "px-4 py-2 text-sm",
};

export function Badge({
  caps = false,
  children,
  className,
  tone = "neutral",
  size = "xs",
}: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md font-semibold",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        caps ? "uppercase tracking-widest" : "tracking-[0.02em]",
        className,
      )}
    >
      {children}
    </span>
  );
}
