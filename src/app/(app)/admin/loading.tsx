import { pageShellAccents } from "@/components/PageShell";
import { RouteLoadingState } from "@/components/RouteLoadingState";
import { SurfacePanel } from "@/components/SurfacePanel";

function LoadingBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-stone-200/80 dark:bg-stone-800/80 ${className}`}
    />
  );
}

/**
 * Renders the loading skeleton for the private instructor workspace.
 */
export default function Loading() {
  return (
    <RouteLoadingState
      title="Preparing the review queue"
      description="Loading exercise submissions, ratings, and instructor tools."
      tone="analytics"
      panelClassName="max-w-5xl"
      accents={[
        pageShellAccents.heroEmeraldArc,
        pageShellAccents.topRightSkyOrbInset,
      ]}
      skeleton={
        <div className="space-y-6">
          <div className="space-y-3">
            <LoadingBlock className="h-5 w-40" />
            <LoadingBlock className="h-12 w-80 max-w-full" />
            <LoadingBlock className="h-4 w-[34rem] max-w-full" />
          </div>

          {[0, 1].map((cardIndex) => (
            <SurfacePanel
              key={cardIndex}
              as="section"
              rounded="3xl"
              className="space-y-5 p-6 md:p-8"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <LoadingBlock className="h-7 w-56 max-w-full" />
                  <LoadingBlock className="h-4 w-44 max-w-full" />
                </div>
                <LoadingBlock className="h-9 w-28" />
              </div>
              <LoadingBlock className="h-24 w-full" />
              <div className="grid gap-4 md:grid-cols-2">
                <LoadingBlock className="h-12 w-full" />
                <LoadingBlock className="h-12 w-full" />
              </div>
              <LoadingBlock className="h-36 w-full" />
            </SurfacePanel>
          ))}
        </div>
      }
    />
  );
}
