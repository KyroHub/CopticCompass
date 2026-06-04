"use client";

import { BarChart3 } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import {
  ANALYTICS_CONSENT_DENIED,
  ANALYTICS_CONSENT_GRANTED,
  isAnalyticsConsentRequired,
  readAnalyticsConsentPreference,
  subscribeToAnalyticsConsentChanges,
  writeAnalyticsConsentPreference,
} from "@/lib/analyticsConsent";

/**
 * Small opt-in control for the strict consent-first analytics posture.
 */
export function AnalyticsConsentPreference() {
  const { t } = useLanguage();
  const isAllowed = useSyncExternalStore(
    subscribeToAnalyticsConsentChanges,
    hasAllowedAnalyticsConsent,
    () => false,
  );

  if (!isAnalyticsConsentRequired()) {
    return null;
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextAllowed = event.currentTarget.checked;
    writeAnalyticsConsentPreference(
      nextAllowed ? ANALYTICS_CONSENT_GRANTED : ANALYTICS_CONSENT_DENIED,
    );
    window.location.reload();
  };

  return (
    <section
      aria-labelledby="analytics-preferences-title"
      className="rounded-lg border border-line bg-surface/75 p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong dark:text-accent">
          <BarChart3 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id="analytics-preferences-title"
            className="text-base font-semibold text-ink"
          >
            {t("legal.analyticsPreferences.title")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            {t("legal.analyticsPreferences.description")}
          </p>
        </div>
      </div>

      <label className="checkbox-row mt-4 border border-line bg-paper/70">
        <input
          checked={isAllowed}
          className="checkbox-base"
          onChange={handleChange}
          type="checkbox"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-6 text-ink">
            {t("legal.analyticsPreferences.allowLabel")}
          </span>
          <span className="mt-1 block text-sm leading-6 text-muted">
            {t("legal.analyticsPreferences.allowDescription")}
          </span>
        </span>
      </label>

      <p className="mt-3 text-xs leading-5 text-muted">
        {isAllowed
          ? t("legal.analyticsPreferences.allowedStatus")
          : t("legal.analyticsPreferences.blockedStatus")}
      </p>
    </section>
  );
}

function hasAllowedAnalyticsConsent() {
  return readAnalyticsConsentPreference() === ANALYTICS_CONSENT_GRANTED;
}
