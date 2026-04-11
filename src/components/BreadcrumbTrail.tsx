"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cx } from "@/lib/classes";

export interface BreadcrumbTrailItem {
  label: string;
  href?: string;
  labelClassName?: string;
}

type BreadcrumbTrailProps = {
  items: readonly BreadcrumbTrailItem[];
  className?: string;
};

export function BreadcrumbTrail({ items, className }: BreadcrumbTrailProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cx("text-sm text-stone-500 dark:text-stone-400", className)}
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isCurrentPage = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-2"
            >
              {index > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500"
                  aria-hidden="true"
                />
              ) : null}

              {item.href && !isCurrentPage ? (
                <Link
                  href={item.href}
                  prefetch={false}
                  className={cx(
                    "transition-colors hover:text-stone-900 dark:hover:text-stone-200",
                    item.labelClassName,
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isCurrentPage ? "page" : undefined}
                  className={cx(
                    item.labelClassName,
                    isCurrentPage &&
                      "font-semibold text-stone-700 dark:text-stone-200",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
