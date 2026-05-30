import { SurfacePanel } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";

import type { ReactNode } from "react";

type EmptyStateProps = {
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  title: ReactNode;
  titleClassName?: string;
};

export function EmptyState({
  children,
  className,
  description,
  descriptionClassName,
  title,
  titleClassName,
}: EmptyStateProps) {
  return (
    <SurfacePanel
      rounded="lg"
      className={cx("px-6 py-20 text-center", className)}
    >
      <h3
        className={cx("mb-2 text-2xl font-semibold text-ink", titleClassName)}
      >
        {title}
      </h3>

      {description && (
        <p className={cx("font-medium text-muted", descriptionClassName)}>
          {description}
        </p>
      )}

      {children && <div className="mt-6">{children}</div>}
    </SurfacePanel>
  );
}
