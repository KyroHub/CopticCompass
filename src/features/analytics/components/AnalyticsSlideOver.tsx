import {
  SlideOver,
  SlideOverCloseButton,
  SlideOverContent,
  SlideOverHeader,
  SlideOverTitle,
} from "@/components/SlideOver";

import type { ReactNode } from "react";

type AnalyticsSlideOverProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * Renders a portal-based analytics panel that locks body scroll while open and
 * closes when the backdrop or Escape key is used.
 */
export function AnalyticsSlideOver({
  isOpen,
  onClose,
  title,
  children,
}: AnalyticsSlideOverProps) {
  return (
    <SlideOver open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SlideOverContent className="max-w-2xl">
        <SlideOverHeader className="flex-row items-center justify-between py-4">
          <SlideOverTitle className="text-xl font-bold">{title}</SlideOverTitle>
          <SlideOverCloseButton
            aria-label="Close panel"
            className="rounded-full"
          />
        </SlideOverHeader>

        <div
          id="analytics-slideover-scroll"
          className="flex-1 min-h-0 overflow-y-auto px-6 py-6"
        >
          {children}
        </div>
      </SlideOverContent>
    </SlideOver>
  );
}
