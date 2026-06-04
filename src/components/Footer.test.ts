import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Footer } from "@/components/Footer";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/cookies",
}));

vi.mock("./LanguageProvider", () => ({
  useLanguage: () => ({
    language: "en",
    t: (key: string) =>
      ({
        "footer.apiDocs": "API Docs",
        "footer.contributors": "Contributors",
        "footer.cookiePreferences": "Cookie preferences",
        "footer.cookies": "Cookie Policy",
        "footer.credit": "is independently built and maintained.",
        "footer.developers": "Developers",
        "footer.faq": "FAQ",
        "footer.privacy": "Privacy Policy",
        "footer.rights": "All rights reserved.",
        "footer.terms": "Terms of Service",
        "home.title": "Coptic Compass",
        "nav.contact": "Contact",
      })[key] ?? key,
  }),
}));

describe("Footer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes the localized cookie policy link near legal links", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED", "false");

    const markup = renderToStaticMarkup(React.createElement(Footer));

    expect(markup).toContain('href="/en/cookies"');
    expect(markup).toContain("Cookie Policy");
    expect(markup).not.toContain("Cookie preferences");
  });

  it("shows a persistent cookie preferences action in strict consent mode", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED", "true");

    const markup = renderToStaticMarkup(React.createElement(Footer));

    expect(markup).toContain("Cookie preferences");
  });
});
