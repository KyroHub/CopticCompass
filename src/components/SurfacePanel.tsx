import { cx } from "@/lib/classes";

import type { HTMLAttributes } from "react";

type SurfacePanelVariant = "default" | "subtle" | "elevated";
type SurfacePanelShadow = "soft" | "panel" | "float";
type SurfacePanelRounded = "lg";
export type SurfacePanelTag =
  | "article"
  | "div"
  | "section"
  | "aside"
  | "details";

type SurfacePanelClassNameOptions = {
  className?: string;
  interactive?: boolean;
  rounded?: SurfacePanelRounded;
  shadow?: SurfacePanelShadow;
  variant?: SurfacePanelVariant;
};

const VARIANT_CLASSES: Record<SurfacePanelVariant, string> = {
  default: "bg-surface/95",
  subtle: "bg-surface/80",
  elevated: "bg-elevated/85",
};

const SHADOW_CLASSES: Record<SurfacePanelShadow, string> = {
  soft: "shadow-soft",
  panel: "shadow-panel",
  float: "shadow-panel",
};

const ROUNDED_CLASSES: Record<SurfacePanelRounded, string> = {
  lg: "rounded-lg",
};

export function surfacePanelClassName({
  className,
  interactive = false,
  rounded = "lg",
  shadow = "panel",
  variant = "default",
}: SurfacePanelClassNameOptions = {}) {
  return cx(
    "border border-line backdrop-blur-sm",
    VARIANT_CLASSES[variant],
    SHADOW_CLASSES[shadow],
    ROUNDED_CLASSES[rounded],
    interactive &&
      "transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface",
    className,
  );
}

type SurfacePanelProps = HTMLAttributes<HTMLElement> & {
  as?: SurfacePanelTag;
  interactive?: boolean;
  rounded?: SurfacePanelRounded;
  shadow?: SurfacePanelShadow;
  variant?: SurfacePanelVariant;
};

export function SurfacePanel({
  as = "div",
  className,
  interactive = false,
  rounded = "lg",
  shadow = "panel",
  variant = "default",
  ...props
}: SurfacePanelProps) {
  const Component = as;

  return (
    <Component
      className={surfacePanelClassName({
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
