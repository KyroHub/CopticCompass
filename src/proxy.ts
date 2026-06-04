import { type NextRequest } from "next/server";

import { getPublicLocaleFromPathname } from "@/lib/locale";
import {
  buildContentSecurityPolicy,
  buildContentSecurityPolicyReportOnlyHeader,
} from "@/lib/securityHeaders";
import { CSP_NONCE_HEADER } from "@/lib/server/csp";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Applies a static-friendly CSP to localized public pages while reserving the
 * per-request CSP nonce for the non-localized app shell that still needs it.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLocalizedPublicRoute = Boolean(getPublicLocaleFromPathname(pathname));
  const nonce = isLocalizedPublicRoute
    ? null
    : Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy({ nonce });
  const contentSecurityPolicyReportOnlyHeader =
    buildContentSecurityPolicyReportOnlyHeader({ nonce });
  const requestHeaders = new Headers(request.headers);

  if (nonce) {
    requestHeaders.set(CSP_NONCE_HEADER, nonce);
  }

  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  if (contentSecurityPolicyReportOnlyHeader) {
    response.headers.set(
      contentSecurityPolicyReportOnlyHeader.key,
      contentSecurityPolicyReportOnlyHeader.value,
    );
  }

  return response;
}

/**
 * Limits the proxy to requests that need request-bound work. Localized public
 * pages and static public assets get static headers from next.config.ts, while
 * localized private pages still pass through the proxy for auth session refresh.
 */
export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|.*\\.(?:avif|bmp|css|csv|gif|ico|jpeg|jpg|js|json|map|pdf|png|svg|txt|webp|woff|woff2|xml)$|manifest.json|robots.txt|sitemap.xml|sitemaps(?:/|$)|en(?:/|$)|nl(?:/|$)).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/:locale(en|nl)/:section(admin|dashboard)/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
