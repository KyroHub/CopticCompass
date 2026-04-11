/// <reference types="vite/client" />

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

type RouteHandlerModule = {
  GET?: (...args: unknown[]) => Response | Promise<Response>;
  OPTIONS?: (...args: unknown[]) => Response | Promise<Response>;
};

const discoveredPublicApiRouteModules: Record<string, RouteHandlerModule> =
  import.meta.glob<RouteHandlerModule>("./**/route.ts*", { eager: true });

const publicApiRouteModules = Object.entries(
  discoveredPublicApiRouteModules,
).filter(
  ([path]) =>
    path === "./openapi.json/route.ts" || path.startsWith("./v1/grammar/"),
);

function expectCorsHeaders(response: Response) {
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
    "GET, HEAD, OPTIONS",
  );
  expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
    "Content-Type",
  );
}

function getRouteGetArgs(path: string): unknown[] {
  const baseUrl = "https://example.com";

  if (path === "./openapi.json/route.ts") {
    return [];
  }

  if (
    path === "./v1/grammar/route.ts" ||
    path === "./v1/grammar/manifest/route.ts"
  ) {
    return [];
  }

  if (path === "./v1/grammar/lessons/route.ts") {
    return [
      new NextRequest(`${baseUrl}/api/v1/grammar/lessons?status=published`),
    ];
  }

  if (path === "./v1/grammar/examples/route.ts") {
    return [
      new NextRequest(`${baseUrl}/api/v1/grammar/examples?lesson=lesson-1`),
    ];
  }

  if (path === "./v1/grammar/exercises/route.ts") {
    return [
      new NextRequest(`${baseUrl}/api/v1/grammar/exercises?lesson=lesson-1`),
    ];
  }

  if (path === "./v1/grammar/concepts/route.ts") {
    return [
      new NextRequest(`${baseUrl}/api/v1/grammar/concepts?lesson=lesson-1`),
    ];
  }

  if (path === "./v1/grammar/footnotes/route.ts") {
    return [
      new NextRequest(`${baseUrl}/api/v1/grammar/footnotes?lesson=lesson-1`),
    ];
  }

  if (path === "./v1/grammar/sources/route.ts") {
    return [
      new NextRequest(`${baseUrl}/api/v1/grammar/sources?lesson=lesson-1`),
    ];
  }

  if (path === "./v1/grammar/lessons/[slug]/route.ts") {
    return [
      new Request(`${baseUrl}/api/v1/grammar/lessons/lesson-1`),
      { params: Promise.resolve({ slug: "lesson-1" }) },
    ];
  }

  if (path === "./v1/grammar/concepts/[id]/route.ts") {
    return [
      new Request(
        `${baseUrl}/api/v1/grammar/concepts/grammar.concept.significant-letters`,
      ),
      {
        params: Promise.resolve({ id: "grammar.concept.significant-letters" }),
      },
    ];
  }

  if (path === "./v1/grammar/sources/[id]/route.ts") {
    return [
      new Request(
        `${baseUrl}/api/v1/grammar/sources/grammar.source.basisgrammatica-bohairisch-koptisch`,
      ),
      {
        params: Promise.resolve({
          id: "grammar.source.basisgrammatica-bohairisch-koptisch",
        }),
      },
    ];
  }

  throw new Error(`Unhandled public API route fixture for ${path}`);
}

describe("public API CORS", () => {
  it("exposes OPTIONS handlers for every public API route", () => {
    expect(publicApiRouteModules.length).toBeGreaterThan(0);

    publicApiRouteModules.forEach(([, routeModule]) => {
      expect(typeof routeModule.OPTIONS).toBe("function");
    });
  });

  it("applies CORS headers to GET and OPTIONS responses", async () => {
    for (const [path, routeModule] of publicApiRouteModules) {
      expect(typeof routeModule.GET).toBe("function");
      expect(typeof routeModule.OPTIONS).toBe("function");

      const getResponse = await routeModule.GET?.(...getRouteGetArgs(path));

      expect(getResponse).toBeInstanceOf(Response);

      if (getResponse) {
        expectCorsHeaders(getResponse);
      }

      const optionsResponse = await routeModule.OPTIONS?.();

      expect(optionsResponse).toBeInstanceOf(Response);

      if (optionsResponse) {
        expect(optionsResponse.status).toBe(204);
        expectCorsHeaders(optionsResponse);
      }
    }
  });
});
