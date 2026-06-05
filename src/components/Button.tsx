import { cx } from "@/lib/classes";

import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "social" | "link";
type ButtonSize = "sm" | "md" | "lg";

type ButtonClassNameOptions = {
  className?: string;
  fullWidth?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type ControlButtonClassNameOptions = {
  active?: boolean;
  className?: string;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonClassNameOptions;

const BUTTON_BASE_CLASS =
  "inline-flex cursor-pointer select-none items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55";

const CONTROL_BUTTON_BASE_CLASS =
  "inline-flex h-10 min-w-10 cursor-pointer select-none items-center justify-center gap-2 rounded-lg border border-line bg-surface px-0 text-muted shadow-soft transition-colors duration-200 hover:bg-elevated hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55";

const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-10 rounded-md px-3 text-sm",
  md: "h-11 rounded-lg px-4 text-sm",
  lg: "h-12 rounded-lg px-5 text-sm",
};

const LINK_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
};

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-ink text-paper shadow-sm hover:-translate-y-px hover:opacity-90 hover:shadow-soft active:translate-y-0 focus-visible:ring-accent/35 dark:border-accent/35 dark:bg-accent-soft dark:text-ink dark:hover:bg-elevated",
  secondary:
    "border border-line bg-surface/88 text-ink shadow-sm backdrop-blur-sm hover:-translate-y-px hover:border-accent/40 hover:bg-surface active:translate-y-0 focus-visible:ring-accent/30 dark:bg-surface/88 dark:text-ink dark:hover:bg-elevated",
  ghost:
    "text-muted hover:-translate-y-px hover:bg-elevated hover:text-ink active:translate-y-0 focus-visible:ring-accent/30 dark:text-muted dark:hover:text-ink",
  social:
    "border border-line bg-surface text-ink shadow-sm hover:-translate-y-px hover:border-accent/40 hover:bg-elevated active:translate-y-0 focus-visible:ring-accent/30 dark:text-ink",
  link: "text-accent-strong hover:text-ink hover:underline focus-visible:ring-accent/30 dark:text-accent dark:hover:text-accent-strong",
};

export function buttonClassName({
  className,
  fullWidth = false,
  size = "md",
  variant = "primary",
}: ButtonClassNameOptions = {}) {
  return cx(
    BUTTON_BASE_CLASS,
    variant === "link" ? LINK_SIZE_CLASSES[size] : BUTTON_SIZE_CLASSES[size],
    BUTTON_VARIANT_CLASSES[variant],
    fullWidth && "w-full",
    className,
  );
}

const CONTROL_BUTTON_ACTIVE_CLASS =
  "border-coptic/40 bg-coptic-soft text-coptic shadow-sm ring-2 ring-coptic/20 hover:border-coptic/50 hover:bg-coptic-soft hover:text-coptic";

export function controlButtonClassName({
  active = false,
  className,
}: ControlButtonClassNameOptions = {}) {
  return cx(
    CONTROL_BUTTON_BASE_CLASS,
    className,
    active && CONTROL_BUTTON_ACTIVE_CLASS,
  );
}

export function iconButtonClassName({
  active = false,
  className,
}: ControlButtonClassNameOptions = {}) {
  return controlButtonClassName({
    active,
    className: cx("h-10 w-10 px-0", className),
  });
}

export function Button({
  className,
  fullWidth = false,
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName({ className, fullWidth, size, variant })}
      {...props}
    />
  );
}
