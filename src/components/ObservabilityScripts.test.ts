import { Fragment, createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsentGatedObservabilityScripts } from "@/components/ConsentGatedObservabilityScripts";
import { ObservabilityScripts } from "@/components/ObservabilityScripts";

import type { ReactElement } from "react";

function enableProductionVercel() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
}

function expectElement(value: unknown): ReactElement {
  expect(isValidElement(value)).toBe(true);
  return value as ReactElement;
}

describe("ObservabilityScripts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not render outside production Vercel deployments", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "development");

    expect(ObservabilityScripts()).toBeNull();
  });

  it("keeps the default production Vercel scripts ungated", () => {
    enableProductionVercel();
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED", "false");

    const element = expectElement(ObservabilityScripts());

    expect(element.type).toBe(Fragment);
    expect(element.props).toMatchObject({
      children: expect.arrayContaining([
        expect.objectContaining({ type: "script" }),
        expect.objectContaining({ type: "script" }),
      ]),
    });
  });

  it("uses the consent gate when strict analytics consent is required", () => {
    enableProductionVercel();
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED", "true");

    const element = expectElement(ObservabilityScripts());

    expect(element.type).toBe(ConsentGatedObservabilityScripts);
    expect(element.props).toMatchObject({
      scripts: expect.arrayContaining([
        expect.objectContaining({ src: expect.stringContaining("insights") }),
        expect.objectContaining({
          src: expect.stringContaining("speed-insights"),
        }),
      ]),
    });
  });

  it("does not render analytics scripts in strict mode before consent", () => {
    const markup = renderToStaticMarkup(
      createElement(ConsentGatedObservabilityScripts, {
        scripts: [
          {
            dataAttributes: { "data-sdkn": "@vercel/analytics/next" },
            src: "/_vercel/insights/script.js",
          },
          {
            dataAttributes: { "data-sdkn": "@vercel/speed-insights/next" },
            src: "/_vercel/speed-insights/script.js",
          },
        ],
      }),
    );

    expect(markup).toContain("Accept analytics");
    expect(markup).toContain("Essential only");
    expect(markup).not.toContain("<script");
    expect(markup).not.toContain("/_vercel/insights/script.js");
    expect(markup).not.toContain("/_vercel/speed-insights/script.js");
  });
});
