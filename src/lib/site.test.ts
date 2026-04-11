import { describe, expect, it } from "vitest";

import { buildPageTitle, siteConfig } from "./site";

describe("site config", () => {
  it("models the product brand separately from founder attribution", () => {
    expect(siteConfig.brandName).toBe("Coptic Compass");
    expect(siteConfig.descriptor).toBe(
      "Coptic Dictionary, Grammar, Publications, and Shenute AI",
    );
    expect(siteConfig.founderLine).toBe("by Kyrillos Wannes");
    expect(siteConfig.founderCreditLine).toBe("Built by Copts for Copts");
  });

  it("builds page titles from the concise brand name", () => {
    expect(buildPageTitle("Dictionary")).toBe("Dictionary | Coptic Compass");
  });
});
