"use client";

import { useEffect } from "react";

import { pageShellAccents } from "@/components/PageShell";
import { RouteErrorState } from "@/components/RouteErrorState";

/**
 * Renders the fallback error boundary for the private instructor workspace.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route failed to render", error);
  }, [error]);

  return (
    <RouteErrorState
      title="We couldn't load the instructor queue"
      description="The review workspace ran into a temporary issue while preparing submissions."
      details="Submission data or review controls were interrupted before the page finished rendering. Try again first, and if the issue persists, return to the student dashboard while we investigate."
      tone="analytics"
      primaryHref="/dashboard"
      primaryLabel="Open dashboard"
      reset={reset}
      accents={[
        pageShellAccents.heroEmeraldArc,
        pageShellAccents.topRightSkyOrbInset,
      ]}
    />
  );
}
