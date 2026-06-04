import analyticsPackage from "@vercel/analytics/package.json";
import speedInsightsPackage from "@vercel/speed-insights/package.json";

import { ConsentGatedObservabilityScripts } from "@/components/ConsentGatedObservabilityScripts";
import { isAnalyticsConsentRequired } from "@/lib/analyticsConsent";
import { isVercelObservabilityEnabled } from "@/lib/vercelMonitoring";
import type { Language } from "@/types/i18n";

type ConfigSection = Record<string, unknown>;

type ScriptDefinition = {
  dataAttributes: Record<string, string>;
  src: string;
};

type ObservabilityScriptsProps = {
  language?: Language;
  nonce?: string | null;
};

/**
 * Mounts Vercel Analytics and Speed Insights only in production Vercel
 * deployments, without pulling their client components into every route chunk.
 */
export function ObservabilityScripts({
  language,
  nonce,
}: ObservabilityScriptsProps = {}) {
  if (!isVercelObservabilityEnabled()) {
    return null;
  }

  const clientConfig = parseClientConfig();
  const basePath = readEnvString("NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH");
  const analytics = createAnalyticsScript(clientConfig.analytics, basePath);
  const speedInsights = createSpeedInsightsScript(
    clientConfig.speedInsights,
    basePath,
  );
  const scripts = [analytics, speedInsights] as const;

  if (isAnalyticsConsentRequired()) {
    return (
      <ConsentGatedObservabilityScripts
        language={language}
        nonce={nonce}
        scripts={scripts}
      />
    );
  }

  return (
    <>
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

function createAnalyticsScript(
  config: ConfigSection | undefined,
  basePath: string | undefined,
): ScriptDefinition {
  const dataset: Record<string, string> = {
    sdkn: "@vercel/analytics/next",
    sdkv: analyticsPackage.version,
  };

  if (readBoolean(config, "disableAutoTrack")) {
    dataset.disableAutoTrack = "1";
  }

  setDatasetValue(dataset, "viewEndpoint", readString(config, "viewEndpoint"));
  setDatasetValue(
    dataset,
    "eventEndpoint",
    readString(config, "eventEndpoint"),
  );
  setDatasetValue(
    dataset,
    "sessionEndpoint",
    readString(config, "sessionEndpoint"),
  );
  setDatasetValue(dataset, "dsn", readString(config, "dsn"));

  const configuredEndpoint = readString(config, "endpoint");
  if (configuredEndpoint) {
    dataset.endpoint = configuredEndpoint;
  } else if (basePath) {
    dataset.endpoint = makeAbsolute(`${basePath}/insights`);
  }

  return {
    dataAttributes: toDataAttributes(dataset),
    src:
      readString(config, "scriptSrc") ??
      (basePath
        ? makeAbsolute(`${basePath}/insights/script.js`)
        : "/_vercel/insights/script.js"),
  };
}

function createSpeedInsightsScript(
  config: ConfigSection | undefined,
  basePath: string | undefined,
): ScriptDefinition {
  const dataset: Record<string, string> = {
    sdkn: "@vercel/speed-insights/next",
    sdkv: speedInsightsPackage.version,
  };

  setDatasetValue(
    dataset,
    "sampleRate",
    readStringOrNumber(config, "sampleRate"),
  );
  setDatasetValue(dataset, "route", readString(config, "route"));
  setDatasetValue(dataset, "dsn", readString(config, "dsn"));

  const configuredEndpoint = readString(config, "endpoint");
  if (configuredEndpoint) {
    dataset.endpoint = makeAbsolute(configuredEndpoint);
  } else if (basePath) {
    dataset.endpoint = makeAbsolute(`${basePath}/speed-insights/vitals`);
  }

  const configuredSource =
    readString(config, "scriptSrc") ??
    getSpeedInsightsScriptSource({ basePath, dsn: readString(config, "dsn") });

  return {
    dataAttributes: toDataAttributes(dataset),
    src: configuredSource,
  };
}

function getSpeedInsightsScriptSource({
  basePath,
  dsn,
}: {
  basePath: string | undefined;
  dsn: string | undefined;
}) {
  if (dsn) {
    return "https://va.vercel-scripts.com/v1/speed-insights/script.js";
  }

  if (basePath) {
    return makeAbsolute(`${basePath}/speed-insights/script.js`);
  }

  return "/_vercel/speed-insights/script.js";
}

function parseClientConfig(): {
  analytics?: ConfigSection;
  speedInsights?: ConfigSection;
} {
  const config = readEnvString(
    "NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG",
  );

  if (!config) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(config);

    if (!isRecord(parsed)) {
      return {};
    }

    return {
      analytics: isRecord(parsed.analytics) ? parsed.analytics : undefined,
      speedInsights: isRecord(parsed.speedInsights)
        ? parsed.speedInsights
        : undefined,
    };
  } catch {
    return {};
  }
}

function readEnvString(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readBoolean(config: ConfigSection | undefined, key: string) {
  return config?.[key] === true;
}

function readString(config: ConfigSection | undefined, key: string) {
  const value = config?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readStringOrNumber(config: ConfigSection | undefined, key: string) {
  const value = config?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function setDatasetValue(
  dataset: Record<string, string>,
  key: string,
  value: string | undefined,
) {
  if (value) {
    dataset[key] = value;
  }
}

function toDataAttributes(dataset: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(dataset).map(([key, value]) => [`data-${key}`, value]),
  ) as Record<string, string>;
}

function makeAbsolute(url: string) {
  return url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/")
    ? url
    : `/${url}`;
}

function isRecord(value: unknown): value is ConfigSection {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
