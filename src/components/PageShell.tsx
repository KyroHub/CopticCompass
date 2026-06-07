import { cx } from "@/lib/classes";

import type { ReactNode } from "react";

type PageAccent = string;
export type PageShellWidth = "narrow" | "standard";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  accents?: readonly PageAccent[];
  width?: PageShellWidth;
};

const ACCENT_BASE_CLASS =
  "pointer-events-none absolute -z-10 transition-colors duration-500";

const heroGoldBand =
  "top-0 left-0 h-56 w-full border-b border-accent/10 bg-accent-soft/45 dark:bg-accent-soft/20";
const heroCopticBand =
  "top-0 left-0 h-56 w-full border-b border-coptic/10 bg-coptic-soft/35 dark:bg-coptic-soft/15";
const topLeftGoldWash =
  "top-0 left-0 h-72 w-1/2 max-w-3xl bg-accent-soft/30 dark:bg-accent-soft/15";
const topLeftGoldWashInset =
  "top-16 left-0 h-64 w-1/2 max-w-3xl bg-accent-soft/25 dark:bg-accent-soft/10";
const topRightGoldWash =
  "top-0 right-0 h-72 w-1/2 max-w-3xl bg-accent-soft/30 dark:bg-accent-soft/15";
const topRightGoldWashInset =
  "top-16 right-0 h-64 w-1/2 max-w-3xl bg-accent-soft/25 dark:bg-accent-soft/10";
const topRightCopticWash =
  "top-0 right-0 h-72 w-1/2 max-w-3xl bg-coptic-soft/30 dark:bg-coptic-soft/15";
const topRightCopticWashInset =
  "top-16 right-0 h-64 w-1/2 max-w-3xl bg-coptic-soft/25 dark:bg-coptic-soft/10";
const topRightCopticWashOffset =
  "top-24 right-0 h-56 w-1/2 max-w-3xl bg-coptic-soft/25 dark:bg-coptic-soft/10";
const bottomLeftCopticWash =
  "bottom-0 left-0 h-72 w-1/2 max-w-3xl bg-coptic-soft/25 dark:bg-coptic-soft/10";
const bottomLeftCopticWashSoft =
  "bottom-0 left-0 h-72 w-1/2 max-w-3xl bg-coptic-soft/20 dark:bg-coptic-soft/10";
const bottomRightCopticWash =
  "bottom-0 right-0 h-72 w-1/2 max-w-3xl bg-coptic-soft/25 dark:bg-coptic-soft/10";

export const pageShellAccents = {
  heroGoldBand,
  heroCopticBand,
  topLeftGoldWash,
  topLeftGoldWashInset,
  topRightGoldWash,
  topRightGoldWashInset,
  topRightCopticWash,
  topRightCopticWashInset,
  topRightCopticWashOffset,
  bottomLeftCopticWash,
  bottomLeftCopticWashSoft,
  bottomRightCopticWash,
} as const;

const WIDTH_CLASSES: Record<PageShellWidth, string> = {
  narrow: "page-content-narrow",
  standard: "page-content-standard",
};

export function PageShell({
  children,
  className,
  contentClassName,
  accents = [],
  width,
}: PageShellProps) {
  return (
    <section className={cx("relative overflow-x-clip", className)}>
      {accents.map((accentClassName, index) => (
        <div key={index} className={cx(ACCENT_BASE_CLASS, accentClassName)} />
      ))}
      <div
        className={cx(
          "relative z-10",
          width ? WIDTH_CLASSES[width] : undefined,
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
