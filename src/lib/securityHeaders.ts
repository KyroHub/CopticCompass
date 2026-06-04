import {
  VERCEL_SCRIPT_ORIGIN,
  isVercelObservabilityEnabled,
} from "./vercelMonitoring";

type SecurityHeader = {
  key: string;
  value: string;
};

type SecurityHeadersOptions = {
  contentSecurityPolicyReportUri?: string | null;
  includeContentSecurityPolicy?: boolean;
  includeContentSecurityPolicyReportOnly?: boolean;
  nonce?: string | null;
  nodeEnv?: string | null;
  supabaseUrl?: string | null;
};

const APPLE_MEDIA_ORIGINS = [
  "https://tools.applemediaservices.com",
  "https://toolbox.marketingtools.apple.com",
  "https://*.mzstatic.com",
] as const;

/**
 * Extracts the origin from the configured Supabase URL so CSP directives can
 * allow the exact backend host when present.
 */
function getSupabaseOrigin(supabaseUrl?: string | null) {
  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return null;
  }
}

/**
 * Reports whether the current runtime should use production-only security
 * restrictions such as HSTS and upgraded requests.
 */
function isProductionEnvironment(nodeEnv?: string | null) {
  return nodeEnv === "production";
}

/**
 * Reads boolean env flags conservatively so optional hardening must be explicit.
 */
function isEnabledFlag(value?: string | null) {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Validates CSP report destinations before placing them in a response header.
 */
function getContentSecurityPolicyReportUri(reportUri?: string | null) {
  const normalizedReportUri = reportUri?.trim();
  if (!normalizedReportUri) {
    return null;
  }

  if (/[\s;]/.test(normalizedReportUri)) {
    return null;
  }

  if (
    normalizedReportUri.startsWith("/") &&
    !normalizedReportUri.startsWith("//")
  ) {
    return normalizedReportUri;
  }

  try {
    const parsedReportUri = new URL(normalizedReportUri);
    return parsedReportUri.protocol === "https:"
      ? parsedReportUri.toString()
      : null;
  } catch {
    return null;
  }
}

/**
 * Deduplicates and joins CSP source values while skipping falsy entries.
 */
function buildSourceList(...sources: Array<string | null | undefined | false>) {
  return [...new Set(sources.filter(Boolean))].join(" ");
}

/**
 * Builds the `script-src` CSP directive, using a nonce when provided and
 * falling back to development-friendly allowances when necessary.
 */
function buildScriptSourceDirective(options: {
  allowUnsafeEval: boolean;
  allowUnsafeInline: boolean;
  nonce: string | null;
}) {
  const scriptNonceSource = options.nonce ? `'nonce-${options.nonce}'` : null;
  const vercelScriptOrigin = isVercelObservabilityEnabled({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })
    ? VERCEL_SCRIPT_ORIGIN
    : null;

  return `script-src ${buildSourceList(
    "'self'",
    scriptNonceSource ?? (options.allowUnsafeInline ? "'unsafe-inline'" : null),
    scriptNonceSource ? "'strict-dynamic'" : null,
    vercelScriptOrigin,
    options.allowUnsafeEval ? "'unsafe-eval'" : null,
  )}`;
}

/**
 * Builds the `style-src` directive, keeping the enforced policy compatible with
 * current Next.js/Tailwind output while allowing report-only experiments.
 */
function buildStyleSourceDirective(options: { allowUnsafeInline: boolean }) {
  return `style-src ${buildSourceList(
    "'self'",
    options.allowUnsafeInline ? "'unsafe-inline'" : null,
  )}`;
}

/**
 * Builds the `img-src` CSP directive for first-party assets, generated blobs,
 * Supabase-hosted media, and Apple media assets.
 */
function buildImageSourceDirective(supabaseOrigin: string | null) {
  return `img-src ${buildSourceList(
    "'self'",
    "data:",
    "blob:",
    supabaseOrigin,
    ...APPLE_MEDIA_ORIGINS,
  )}`;
}

/**
 * Builds the `connect-src` CSP directive for first-party requests, Supabase,
 * and development-time HTTP/WebSocket tooling.
 */
function buildConnectSourceDirective(options: {
  isProduction: boolean;
  supabaseOrigin: string | null;
}) {
  return `connect-src ${buildSourceList(
    "'self'",
    options.supabaseOrigin,
    options.isProduction ? null : "http:",
    options.isProduction ? null : "https:",
    options.isProduction ? null : "ws:",
    options.isProduction ? null : "wss:",
  )}`;
}

/**
 * Assembles the ordered CSP directive list used by the site shell and route
 * responses.
 */
function buildContentSecurityPolicyDirectives(options: {
  isProduction: boolean;
  nonce: string | null;
  reportOnly: boolean;
  reportUri: string | null;
  supabaseOrigin: string | null;
}) {
  const allowUnsafeInline = !options.reportOnly;
  const allowUnsafeEval = !options.isProduction && !options.reportOnly;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "object-src 'none'",
    buildScriptSourceDirective({
      allowUnsafeEval,
      allowUnsafeInline,
      nonce: options.nonce,
    }),
    "script-src-attr 'none'",
    buildStyleSourceDirective({ allowUnsafeInline }),
    "font-src 'self' data:",
    buildImageSourceDirective(options.supabaseOrigin),
    buildConnectSourceDirective(options),
    "media-src 'self' data:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    options.isProduction ? "upgrade-insecure-requests" : null,
    options.reportUri ? `report-uri ${options.reportUri}` : null,
  ].filter(Boolean);
}

/**
 * Builds the CSP header value used by the app shell and dynamic responses.
 * When a nonce is provided, script execution is limited to that nonce; in
 * development, extra transport and eval allowances remain enabled for tooling.
 */
export function buildContentSecurityPolicy(
  options: SecurityHeadersOptions = {},
) {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const nonce = options.nonce ?? null;
  const supabaseOrigin = getSupabaseOrigin(
    options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const isProduction = isProductionEnvironment(nodeEnv);
  const directives = buildContentSecurityPolicyDirectives({
    isProduction,
    nonce,
    reportOnly: false,
    reportUri: null,
    supabaseOrigin,
  });

  return directives.join("; ");
}

/**
 * Builds a stricter, non-enforcing CSP used to collect browser reports before a
 * future enforcement change.
 */
export function buildContentSecurityPolicyReportOnly(
  options: SecurityHeadersOptions = {},
) {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const nonce = options.nonce ?? null;
  const reportUri = getContentSecurityPolicyReportUri(
    options.contentSecurityPolicyReportUri ?? process.env.CSP_REPORT_URI,
  );
  const supabaseOrigin = getSupabaseOrigin(
    options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const isProduction = isProductionEnvironment(nodeEnv);
  const directives = buildContentSecurityPolicyDirectives({
    isProduction,
    nonce,
    reportOnly: true,
    reportUri,
    supabaseOrigin,
  });

  return directives.join("; ");
}

/**
 * Returns the report-only CSP header when the stricter diagnostic mode is
 * explicitly enabled.
 */
export function buildContentSecurityPolicyReportOnlyHeader(
  options: SecurityHeadersOptions = {},
): SecurityHeader | null {
  const includeContentSecurityPolicyReportOnly =
    options.includeContentSecurityPolicyReportOnly ??
    isEnabledFlag(process.env.CSP_REPORT_ONLY);

  if (!includeContentSecurityPolicyReportOnly) {
    return null;
  }

  return {
    key: "Content-Security-Policy-Report-Only",
    value: buildContentSecurityPolicyReportOnly(options),
  };
}

/**
 * Returns the full set of security headers applied by the app.
 * CSP can be disabled for routes that need a narrower override, while HSTS is
 * emitted only in production environments.
 */
export function buildSecurityHeaders(
  options: SecurityHeadersOptions = {},
): SecurityHeader[] {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const includeContentSecurityPolicy =
    options.includeContentSecurityPolicy ?? true;
  const contentSecurityPolicyReportOnlyHeader =
    buildContentSecurityPolicyReportOnlyHeader(options);
  const headers = [
    includeContentSecurityPolicy
      ? {
          key: "Content-Security-Policy",
          value: buildContentSecurityPolicy(options),
        }
      : null,
    contentSecurityPolicyReportOnlyHeader,
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin",
    },
    {
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    },
    isProductionEnvironment(nodeEnv)
      ? {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        }
      : null,
  ].filter((header): header is SecurityHeader => Boolean(header));

  return headers;
}
