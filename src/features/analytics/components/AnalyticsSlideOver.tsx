import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { iconButtonClassName } from "@/components/Button";
import { cx } from "@/lib/classes";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

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
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      <div
        className={cx(
          "fixed inset-0 bg-ink/45 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/60",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      <div
        className={cx(
          "relative flex h-full w-full max-w-2xl flex-col bg-surface shadow-2xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className={iconButtonClassName({ className: "rounded-full" })}
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          id="analytics-slideover-scroll"
          className="flex-1 min-h-0 overflow-y-auto px-6 py-6"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
