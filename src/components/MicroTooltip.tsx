import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { cx } from "@/lib/classes";

import type { CSSProperties, ReactNode } from "react";

type MicroTooltipProps = {
  alignItems?: "baseline" | "center";
  bubbleClassName?: string;
  children: ReactNode;
  className?: string;
  focusable?: boolean;
  label: string;
};

export const chartTooltipContentBaseStyle = {
  borderRadius: "8px",
  borderStyle: "solid",
  borderWidth: 1,
  boxShadow:
    "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  fontSize: "12px",
  lineHeight: 1.35,
  padding: "8px 10px",
} satisfies CSSProperties;

export const chartTooltipItemBaseStyle = {
  fontWeight: 500,
  paddingBlock: "1px",
} satisfies CSSProperties;

export const chartTooltipLabelBaseStyle = {
  fontWeight: 700,
  marginBlockEnd: "4px",
} satisfies CSSProperties;

/**
 * Provides the compact explanatory tooltip treatment used by dictionary
 * abbreviations, form symbols, and small metadata labels.
 */
export function MicroTooltip({
  alignItems = "baseline",
  bubbleClassName,
  children,
  className,
  focusable = true,
  label,
}: MicroTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cx(
            "inline-flex cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded-sm",
            alignItems === "center" ? "items-center" : "items-baseline",
            className,
          )}
          tabIndex={focusable ? 0 : -1}
        >
          {children}
          <span className="sr-only">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent variant="micro" className={bubbleClassName}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
