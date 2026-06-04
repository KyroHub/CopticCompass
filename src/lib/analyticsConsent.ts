const ANALYTICS_CONSENT_STORAGE_KEY = "coptic-compass-analytics-consent";
const ANALYTICS_CONSENT_CHANGE_EVENT =
  "coptic-compass:analytics-consent-change";
export const ANALYTICS_PREFERENCES_OPEN_EVENT =
  "coptic-compass:analytics-preferences-open";
export const ANALYTICS_CONSENT_GRANTED = "granted";
export const ANALYTICS_CONSENT_DENIED = "denied";

type AnalyticsConsentValue =
  | typeof ANALYTICS_CONSENT_GRANTED
  | typeof ANALYTICS_CONSENT_DENIED;

const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Enables the stricter consent-first analytics posture only when explicitly
 * configured. The default remains the lightweight disclosed analytics posture.
 */
export function isAnalyticsConsentRequired(options?: {
  analyticsConsentRequired?: string | null;
}) {
  const configuredValue =
    options?.analyticsConsentRequired ??
    process.env.NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED;

  return configuredValue?.trim().toLowerCase() === "true";
}

export function isAnalyticsConsentValue(
  value: string | null | undefined,
): value is AnalyticsConsentValue {
  return (
    value === ANALYTICS_CONSENT_GRANTED || value === ANALYTICS_CONSENT_DENIED
  );
}

export function hasGrantedAnalyticsConsent() {
  return readAnalyticsConsentPreference() === ANALYTICS_CONSENT_GRANTED;
}

export function subscribeToAnalyticsConsentChanges(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onChange);
  window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, onChange);
  };
}

export function openAnalyticsPreferences() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_OPEN_EVENT));
}

export function readAnalyticsConsentPreference(): AnalyticsConsentValue | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedValue = window.localStorage.getItem(
    ANALYTICS_CONSENT_STORAGE_KEY,
  );

  if (isAnalyticsConsentValue(storedValue)) {
    return storedValue;
  }

  const cookieValue = readCookieValue(ANALYTICS_CONSENT_STORAGE_KEY);
  return isAnalyticsConsentValue(cookieValue) ? cookieValue : null;
}

export function writeAnalyticsConsentPreference(value: AnalyticsConsentValue) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
  document.cookie = [
    `${ANALYTICS_CONSENT_STORAGE_KEY}=${encodeURIComponent(value)}`,
    "path=/",
    `max-age=${CONSENT_COOKIE_MAX_AGE_SECONDS}`,
    "samesite=lax",
  ].join("; ");
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_CHANGE_EVENT));
}

function readCookieValue(name: string) {
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(encodedName.length));
}
