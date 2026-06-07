"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";

import { cx } from "@/lib/classes";

export const SlideOver = DialogPrimitive.Root;
export const SlideOverTrigger = DialogPrimitive.Trigger;
export const SlideOverPortal = DialogPrimitive.Portal;
export const SlideOverClose = DialogPrimitive.Close;

export const SlideOverOverlay = forwardRef<
  ComponentRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cx(
      "fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm transition-all duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-black/60",
      className,
    )}
    {...props}
  />
));
SlideOverOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const SlideOverContent = forwardRef<
  ComponentRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SlideOverPortal>
    <SlideOverOverlay className="flex justify-end">
      <DialogPrimitive.Content
        ref={ref}
        className={cx(
          "h-full w-full max-w-md border-l border-line bg-surface shadow-panel transition duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </SlideOverOverlay>
  </SlideOverPortal>
));
SlideOverContent.displayName = DialogPrimitive.Content.displayName;

export const SlideOverHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cx(
      "flex flex-col gap-1.5 border-b border-line px-6 py-5 text-left",
      className,
    )}
    {...props}
  />
);
SlideOverHeader.displayName = "SlideOverHeader";

export const SlideOverFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cx(
      "flex flex-col-reverse gap-2 border-t border-line bg-surface px-6 py-5 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);
SlideOverFooter.displayName = "SlideOverFooter";

export const SlideOverTitle = forwardRef<
  ComponentRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cx("text-lg font-semibold text-ink", className)}
    {...props}
  />
));
SlideOverTitle.displayName = DialogPrimitive.Title.displayName;

export const SlideOverDescription = forwardRef<
  ComponentRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cx("text-sm text-muted", className)}
    {...props}
  />
));
SlideOverDescription.displayName = DialogPrimitive.Description.displayName;

export const SlideOverCloseButton = forwardRef<
  ComponentRef<typeof DialogPrimitive.Close>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Close
    ref={ref}
    className={cx(
      "inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-elevated text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:pointer-events-none",
      className,
    )}
    {...props}
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Close</span>
  </DialogPrimitive.Close>
));
SlideOverCloseButton.displayName = "SlideOverCloseButton";
