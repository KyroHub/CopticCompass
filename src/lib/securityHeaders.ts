import {
  VERCEL_SCRIPT_ORIGIN,
  isVercelObservabilityEnabled,
} from "./vercelMonitoring";

type SecurityHeader = {
  key: string;
  value: string;
};

type SecurityHeadersOptions = {
  includeContentSecurityPolicy?: boolean;
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
  isProduction: boolean;
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
    scriptNonceSource ?? "'unsafe-inline'",
    scriptNonceSource ? "'strict-dynamic'" : null,
    vercelScriptOrigin,
    options.isProduction ? null : "'unsafe-eval'",
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
  supabaseOrigin: string | null;
}) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "object-src 'none'",
    buildScriptSourceDirective(options),
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    buildImageSourceDirective(options.supabaseOrigin),
    buildConnectSourceDirective(options),
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    options.isProduction ? "upgrade-insecure-requests" : null,
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
    supabaseOrigin,
  });

  return directives.join("; ");
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
  const headers = [
    includeContentSecurityPolicy
      ? {
          key: "Content-Security-Policy",
          value: buildContentSecurityPolicy(options),
        }
      : null,
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
