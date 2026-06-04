import { describe, expect, it } from "vitest";

import {
  ANALYTICS_CONSENT_DENIED,
  ANALYTICS_CONSENT_GRANTED,
  isAnalyticsConsentRequired,
  isAnalyticsConsentValue,
} from "@/lib/analyticsConsent";

describe("analytics consent helpers", () => {
  it("keeps consent-first analytics disabled unless explicitly enabled", () => {
    expect(isAnalyticsConsentRequired()).toBe(false);
    expect(
      isAnalyticsConsentRequired({ analyticsConsentRequired: "false" }),
    ).toBe(false);
    expect(
      isAnalyticsConsentRequired({ analyticsConsentRequired: " true " }),
    ).toBe(true);
  });

  it("accepts only supported stored consent values", () => {
    expect(isAnalyticsConsentValue(ANALYTICS_CONSENT_GRANTED)).toBe(true);
    expect(isAnalyticsConsentValue(ANALYTICS_CONSENT_DENIED)).toBe(true);
    expect(isAnalyticsConsentValue("yes")).toBe(false);
    expect(isAnalyticsConsentValue(null)).toBe(false);
  });
});
