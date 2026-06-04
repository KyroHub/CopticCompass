"use client";

import { useSyncExternalStore } from "react";

import { AnalyticsConsentBanner } from "@/components/AnalyticsConsentBanner";
import {
  hasGrantedAnalyticsConsent,
  subscribeToAnalyticsConsentChanges,
} from "@/lib/analyticsConsent";
import type { Language } from "@/types/i18n";

type ConsentGatedScriptDefinition = {
  dataAttributes: Record<string, string>;
  src: string;
};

type ConsentGatedObservabilityScriptsProps = {
  language?: Language;
  nonce?: string | null;
  scripts: readonly ConsentGatedScriptDefinition[];
};

/**
 * Defers production analytics script insertion until the visitor has granted
 * the stricter opt-in analytics preference.
 */
export function ConsentGatedObservabilityScripts({
  language,
  nonce,
  scripts,
}: ConsentGatedObservabilityScriptsProps) {
  const canLoadAnalytics = useSyncExternalStore(
    subscribeToAnalyticsConsentChanges,
    hasGrantedAnalyticsConsent,
    () => false,
  );

  if (!canLoadAnalytics) {
    return <AnalyticsConsentBanner language={language} />;
  }

  return (
    <>
      <AnalyticsConsentBanner language={language} />
      {scripts.map((script) => (
        <script
          key={script.src}
          defer
          nonce={nonce ?? undefined}
          src={script.src}
          {...script.dataAttributes}
        />
      ))}
    </>
  );
}
