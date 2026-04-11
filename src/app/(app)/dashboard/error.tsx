"use client";

import { useEffect } from "react";

import { pageShellAccents } from "@/components/PageShell";
import { RouteErrorState } from "@/components/RouteErrorState";

/**
 * Renders the fallback error boundary for the private learner dashboard.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route failed to render", error);
  }, [error]);

  return (
    <RouteErrorState
      title="We couldn't load your dashboard"
      description="Your private workspace hit a temporary problem while loading."
      details="Progress, profile, or submission data could not be prepared for this request. Try again, and if it keeps happening, return to the grammar hub and retry from there."
      tone="brand"
      primaryHref="/grammar"
      primaryLabel="Open grammar hub"
      reset={reset}
      accents={[
        pageShellAccents.topLeftSkyOrb,
        pageShellAccents.bottomRightEmeraldOrb,
      ]}
    />
  );
}
