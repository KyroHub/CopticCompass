"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";

import { cx } from "@/lib/classes";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipPortal = TooltipPrimitive.Portal;

export const TooltipContent = forwardRef<
  ComponentRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?: "micro" | "default" | "rich";
  }
>(({ className, sideOffset = 4, variant = "default", ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cx(
      "z-[80] overflow-hidden bg-surface text-ink shadow-soft animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      variant === "micro" &&
        "max-w-64 rounded-lg border border-line/80 px-2.5 py-1.5 text-center font-sans text-[11px] font-medium leading-snug normal-case tracking-normal",
      variant === "default" &&
        "max-w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-line/80 px-3 py-2.5 text-left text-xs leading-relaxed shadow-panel",
      variant === "rich" &&
        "w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-line/80 px-3 py-3 text-center text-xs leading-5 shadow-panel",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export const TooltipArrow = forwardRef<
  ComponentRef<typeof TooltipPrimitive.Arrow>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    className={cx("fill-surface drop-shadow-sm", className)}
    {...props}
  />
));
TooltipArrow.displayName = TooltipPrimitive.Arrow.displayName;
