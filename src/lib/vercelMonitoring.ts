export const VERCEL_SCRIPT_ORIGIN = "https://va.vercel-scripts.com";

/**
 * Enables Vercel's client-side observability scripts only for production
 * deployments on Vercel so local Lighthouse runs and non-Vercel environments
 * do not pay for third-party script work they cannot use.
 */
export function isVercelObservabilityEnabled(options?: {
  nodeEnv?: string | null;
  vercelEnv?: string | null;
}) {
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV;
  const vercelEnv = options?.vercelEnv ?? process.env.VERCEL_ENV;

  return nodeEnv === "production" && vercelEnv === "production";
}
