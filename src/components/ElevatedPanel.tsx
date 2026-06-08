import { cx } from "@/lib/classes";

import type { HTMLAttributes } from "react";

type ElevatedPanelVariant = "default" | "subtle";
type ElevatedPanelShadow = "none" | "soft" | "panel";
type ElevatedPanelRounded = "md" | "lg" | "xl";
type ElevatedPanelTag =
  | "article"
  | "div"
  | "section"
  | "aside"
  | "details"
  | "form"
  | "main";

type ElevatedPanelClassNameOptions = {
  className?: string;
  interactive?: boolean;
  rounded?: ElevatedPanelRounded;
  shadow?: ElevatedPanelShadow;
  variant?: ElevatedPanelVariant;
};

const VARIANT_CLASSES: Record<ElevatedPanelVariant, string> = {
  default: "bg-elevated/70",
  subtle: "bg-elevated/45",
};

const SHADOW_CLASSES: Record<ElevatedPanelShadow, string> = {
  none: "shadow-none",
  soft: "shadow-soft",
  panel: "shadow-panel",
};

const ROUNDED_CLASSES: Record<ElevatedPanelRounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

export function elevatedPanelClassName({
  className,
  interactive = false,
  rounded = "lg",
  shadow = "none",
  variant = "default",
}: ElevatedPanelClassNameOptions = {}) {
  return cx(
    "border border-line",
    VARIANT_CLASSES[variant],
    SHADOW_CLASSES[shadow],
    ROUNDED_CLASSES[rounded],
    interactive &&
      "transition-colors duration-200 hover:border-accent/35 hover:bg-elevated/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
    className,
  );
}

type ElevatedPanelProps = HTMLAttributes<HTMLElement> & {
  as?: ElevatedPanelTag;
  interactive?: boolean;
  rounded?: ElevatedPanelRounded;
  shadow?: ElevatedPanelShadow;
  variant?: ElevatedPanelVariant;
};

export function ElevatedPanel({
  as = "div",
  className,
  interactive = false,
  rounded = "lg",
  shadow = "none",
  variant = "default",
  ...props
}: ElevatedPanelProps) {
  const Component = as;

  return (
    <Component
      className={elevatedPanelClassName({
        className,
        interactive,
        rounded,
        shadow,
        variant,
      })}
      {...props}
    />
  );
}
