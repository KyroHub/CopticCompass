"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/Button";
import {
  ANALYTICS_CONSENT_DENIED,
  ANALYTICS_CONSENT_GRANTED,
  ANALYTICS_PREFERENCES_OPEN_EVENT,
  readAnalyticsConsentPreference,
  subscribeToAnalyticsConsentChanges,
  writeAnalyticsConsentPreference,
} from "@/lib/analyticsConsent";
import { DEFAULT_LANGUAGE, getTranslation } from "@/lib/i18n";
import type { Language } from "@/types/i18n";

type AnalyticsConsentBannerProps = {
  language?: Language;
};

/**
 * Minimal strict-mode consent banner for Vercel Analytics and Speed Insights.
 */
export function AnalyticsConsentBanner({
  language = DEFAULT_LANGUAGE,
}: AnalyticsConsentBannerProps) {
  const t = (key: Parameters<typeof getTranslation>[1]) =>
    getTranslation(language, key);
  const [isManuallyOpen, setIsManuallyOpen] = useState(false);
  const consent = useSyncExternalStore(
    subscribeToAnalyticsConsentChanges,
    readAnalyticsConsentPreference,
    () => null,
  );

  useEffect(() => {
    const openPreferences = () => {
      setIsManuallyOpen(true);
    };

    window.addEventListener(ANALYTICS_PREFERENCES_OPEN_EVENT, openPreferences);

    return () => {
      window.removeEventListener(
        ANALYTICS_PREFERENCES_OPEN_EVENT,
        openPreferences,
      );
    };
  }, []);

  const isVisible = isManuallyOpen || consent === null;

  if (!isVisible) {
    return null;
  }

  const handleAcceptAnalytics = () => {
    writeAnalyticsConsentPreference(ANALYTICS_CONSENT_GRANTED);
    setIsManuallyOpen(false);
  };

  const handleEssentialOnly = () => {
    const hadAnalytics = consent === ANALYTICS_CONSENT_GRANTED;

    writeAnalyticsConsentPreference(ANALYTICS_CONSENT_DENIED);
    setIsManuallyOpen(false);

    if (hadAnalytics) {
      window.location.reload();
    }
  };

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-3xl rounded-lg border border-line bg-paper/95 p-4 shadow-float backdrop-blur-md"
      role="dialog"
      aria-labelledby="analytics-consent-title"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2
            id="analytics-consent-title"
            className="text-sm font-semibold text-ink"
          >
            {t("legal.analyticsConsentBanner.title")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            {t("legal.analyticsConsentBanner.description")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleEssentialOnly}
          >
            {t("legal.analyticsConsentBanner.essentialOnly")}
          </Button>
          <Button type="button" size="sm" onClick={handleAcceptAnalytics}>
            {t("legal.analyticsConsentBanner.acceptAnalytics")}
          </Button>
        </div>
      </div>
    </div>
  );
}
