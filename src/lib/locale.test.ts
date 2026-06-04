import { describe, expect, it } from "vitest";

import {
  appendSearchAndHash,
  getCookiesPath,
  getFaqPath,
  getPublicLocaleFromPathname,
} from "./locale";

describe("appendSearchAndHash", () => {
  it("preserves both query strings and hashes", () => {
    expect(
      appendSearchAndHash("/nl/grammar/lesson-1", "?q=test", "#section-2"),
    ).toBe("/nl/grammar/lesson-1?q=test#section-2");
  });

  it("normalizes search and hash fragments when prefixes are omitted", () => {
    expect(
      appendSearchAndHash("nl/grammar/lesson-1", "q=test", "section-2"),
    ).toBe("/nl/grammar/lesson-1?q=test#section-2");
  });

  it("returns the pathname unchanged when search and hash are empty", () => {
    expect(appendSearchAndHash("/en/grammar")).toBe("/en/grammar");
  });
});

describe("getPublicLocaleFromPathname", () => {
  it("returns the locale for localized public routes", () => {
    expect(getPublicLocaleFromPathname("/en")).toBe("en");
    expect(getPublicLocaleFromPathname("/nl/privacy")).toBe("nl");
  });

  it("returns null for non-localized routes", () => {
    expect(getPublicLocaleFromPathname("/login")).toBeNull();
    expect(getPublicLocaleFromPathname("/dashboard")).toBeNull();
    expect(getPublicLocaleFromPathname(null)).toBeNull();
  });
});

describe("getFaqPath", () => {
  it("returns locale-aware FAQ routes and the legacy path", () => {
    expect(getFaqPath()).toBe("/faq");
    expect(getFaqPath("en")).toBe("/en/faq");
    expect(getFaqPath("nl")).toBe("/nl/faq");
  });
});

describe("getCookiesPath", () => {
  it("returns locale-aware cookie policy routes and the legacy path", () => {
    expect(getCookiesPath()).toBe("/cookies");
    expect(getCookiesPath("en")).toBe("/en/cookies");
    expect(getCookiesPath("nl")).toBe("/nl/cookies");
  });
});
