import { PageHeader } from "@/components/PageHeader";
import type { PageHeaderTone } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import type { PageShellWidth } from "@/components/PageShell";
import { SkeletonBlock as LoadingBlock } from "@/components/SkeletonBlock";
import { SurfacePanel } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";

import type { ReactNode } from "react";

type RouteLoadingStateProps = {
  accents?: readonly string[];
  description: string;
  eyebrow?: string;
  panelClassName?: string;
  skeleton?: ReactNode;
  title: string;
  tone?: PageHeaderTone;
  width?: PageShellWidth;
};

function DefaultLoadingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <SurfacePanel rounded="lg" className="space-y-5 p-6 md:p-8">
        <LoadingBlock className="h-5 w-32" />
        <LoadingBlock className="h-12 w-3/4" />
        <LoadingBlock className="h-4 w-full" />
        <LoadingBlock className="h-4 w-5/6" />
        <div className="grid gap-4 md:grid-cols-2">
          <LoadingBlock className="h-28 w-full" />
          <LoadingBlock className="h-28 w-full" />
        </div>
      </SurfacePanel>

      <SurfacePanel
        rounded="lg"
        variant="subtle"
        className="space-y-4 p-6 md:p-8"
      >
        <LoadingBlock className="h-5 w-28" />
        <LoadingBlock className="h-20 w-full" />
        <LoadingBlock className="h-20 w-full" />
        <LoadingBlock className="h-12 w-2/3" />
      </SurfacePanel>
    </div>
  );
}

export function RouteLoadingState({
  accents,
  description,
  eyebrow,
  panelClassName,
  skeleton,
  title,
  tone = "default",
  width,
}: RouteLoadingStateProps) {
  return (
    <PageShell
      className="min-h-[80vh] px-6 py-14 md:px-10"
      contentClassName={cx("mx-auto space-y-10", panelClassName)}
      accents={accents}
      width={width}
    >
      <PageHeader
        eyebrow={eyebrow}
        eyebrowVariant={eyebrow ? "badge" : "text"}
        title={title}
        description={description}
        tone={tone}
        size="compact"
        align="left"
      />

      {skeleton ?? <DefaultLoadingSkeleton />}
    </PageShell>
  );
}
