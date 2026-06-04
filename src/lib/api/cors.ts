import { NextResponse } from "next/server";

const PUBLIC_API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
  "Access-Control-Max-Age": "86400",
} as const;

const PUBLIC_API_CACHE_CONTROL =
  "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";

/**
 * Applies the shared public-API CORS headers to a response without
 * overwriting any route-specific values that were already set.
 */
function withPublicApiCors(response: NextResponse) {
  Object.entries(PUBLIC_API_CORS_HEADERS).forEach(([key, value]) => {
    if (!response.headers.has(key)) {
      response.headers.set(key, value);
    }
  });

  return response;
}

/**
 * Returns a JSON response for the public read-only API with the shared CORS
 * policy applied.
 */
export function publicApiJsonResponse(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);

  if (response.status === 200 && !response.headers.has("Cache-Control")) {
    response.headers.set("Cache-Control", PUBLIC_API_CACHE_CONTROL);
  }

  return withPublicApiCors(response);
}

/**
 * Returns the shared CORS preflight response for public read-only API routes.
 */
export function publicApiOptionsResponse() {
  return withPublicApiCors(
    new NextResponse(null, {
      status: 204,
    }),
  );
}
