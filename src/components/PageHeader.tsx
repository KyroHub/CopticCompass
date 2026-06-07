import { Badge } from "@/components/Badge";
import { cx } from "@/lib/classes";

import type { ReactNode } from "react";

export type PageHeaderTone = "default" | "brand" | "coptic" | "analytics";
type PageHeaderSize = "hero" | "page" | "compact" | "workspace" | "section";
type PageHeaderAlign = "center" | "left";
type EyebrowVariant = "text" | "badge";

type PageHeaderAs = "h1" | "h2" | "h3";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  align?: PageHeaderAlign;
  as?: PageHeaderAs;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  eyebrowClassName?: string;
  eyebrowVariant?: EyebrowVariant;
  size?: PageHeaderSize;
  tone?: PageHeaderTone;
};

const TITLE_TONE_CLASSES: Record<PageHeaderTone, string> = {
  default: "text-ink",
  brand: "text-ink",
  coptic: "text-coptic",
  analytics: "text-coptic",
};

const TITLE_SIZE_CLASSES: Record<PageHeaderSize, string> = {
  hero: "text-5xl md:text-7xl",
  page: "text-4xl md:text-5xl",
  compact: "text-3xl md:text-4xl",
  workspace: "text-3xl md:text-4xl",
  section: "text-xl md:text-2xl",
};

const DESCRIPTION_SIZE_CLASSES: Record<PageHeaderSize, string> = {
  hero: "text-lg md:text-xl",
  page: "text-lg md:text-xl",
  compact: "text-base md:text-lg",
  workspace: "text-base md:text-lg",
  section: "text-sm leading-6",
};

export function PageHeader({
  title,
  description,
  eyebrow,
  align = "center",
  as = "h1",
  className,
  titleClassName,
  descriptionClassName,
  eyebrowClassName,
  eyebrowVariant = "text",
  size = "page",
  tone = "default",
}: PageHeaderProps) {
  const centered = align === "center";
  const Component = as;

  return (
    <div
      className={cx(
        "space-y-4",
        centered ? "text-center" : "text-left",
        className,
      )}
    >
      {eyebrow &&
        (eyebrowVariant === "badge" ? (
          <Badge
            tone="accent"
            size="xs"
            caps
            className={cx(centered && "mx-auto", eyebrowClassName)}
          >
            {eyebrow}
          </Badge>
        ) : (
          <span
            className={cx(
              "text-xs font-semibold uppercase tracking-widest text-accent-strong dark:text-accent",
              centered && "mx-auto",
              eyebrowClassName,
            )}
          >
            {eyebrow}
          </span>
        ))}

      <Component
        className={cx(
          "font-extrabold tracking-tight",
          description ? "pb-2" : "pb-0",
          TITLE_SIZE_CLASSES[size],
          TITLE_TONE_CLASSES[tone],
          titleClassName,
        )}
      >
        {title}
      </Component>

      {description && (
        <p
          className={cx(
            "font-medium text-muted",
            DESCRIPTION_SIZE_CLASSES[size],
            centered ? "mx-auto max-w-3xl" : "max-w-3xl",
            descriptionClassName,
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
