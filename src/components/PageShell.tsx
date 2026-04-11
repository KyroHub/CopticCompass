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

export const pageShellAccents = {
  heroSkyArc:
    "top-0 left-0 h-[520px] w-full rounded-b-full bg-sky-500/10 blur-[120px] dark:bg-sky-900/10",
  heroEmeraldArc:
    "top-0 left-0 h-[500px] w-full rounded-b-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-900/10",
  topLeftSkyOrb:
    "top-0 left-0 h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[120px] dark:bg-sky-900/10",
  topLeftSkyOrbInset:
    "top-20 left-[-5%] h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[110px] dark:bg-sky-900/10",
  topRightSkyOrb:
    "top-0 right-0 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[120px] dark:bg-sky-900/10",
  topRightSkyOrbInset:
    "top-20 right-[-10%] h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[100px] dark:bg-sky-900/10",
  topRightEmeraldOrb:
    "top-0 right-0 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-900/10",
  topRightEmeraldOrbInset:
    "top-20 right-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-900/10",
  topRightEmeraldOrbOffset:
    "top-28 right-[-10%] h-[440px] w-[440px] rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-900/10",
  bottomLeftEmeraldOrb:
    "bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[110px] dark:bg-emerald-900/10",
  bottomLeftEmeraldOrbSoft:
    "bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-900/10",
  bottomRightEmeraldOrb:
    "bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-900/10",
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
    <section className={cx("relative overflow-hidden", className)}>
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
