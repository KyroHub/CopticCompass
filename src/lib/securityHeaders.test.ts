import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  buildContentSecurityPolicyReportOnly,
  buildSecurityHeaders,
} from "./securityHeaders";

function getDirectiveValue(policy: string, directiveName: string) {
  const directive = policy
    .split("; ")
    .find(
      (entry) =>
        entry.startsWith(`${directiveName} `) || entry === directiveName,
    );

  if (!directive) {
    return null;
  }

  return directive === directiveName
    ? ""
    : directive.slice(directiveName.length + 1);
}

describe("securityHeaders", () => {
  it("builds a tighter production CSP around embeds and script attributes", () => {
    const policy = buildContentSecurityPolicy({
      nodeEnv: "production",
      supabaseUrl: "https://project.supabase.co",
    });

    expect(getDirectiveValue(policy, "frame-src")).toBe("'none'");
    expect(getDirectiveValue(policy, "child-src")).toBe("'none'");
    expect(getDirectiveValue(policy, "script-src-attr")).toBe("'none'");
    expect(getDirectiveValue(policy, "media-src")).toBe("'self' data:");
    expect(getDirectiveValue(policy, "connect-src")).toBe(
      "'self' https://project.supabase.co",
    );
    expect(getDirectiveValue(policy, "img-src")).toContain(
      "https://project.supabase.co",
    );
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("keeps development CSP compatible with local tooling", () => {
    const policy = buildContentSecurityPolicy({
      nodeEnv: "development",
      supabaseUrl: "https://project.supabase.co",
    });

    expect(getDirectiveValue(policy, "script-src")).toContain("'unsafe-eval'");
    expect(getDirectiveValue(policy, "connect-src")).toBe(
      "'self' https://project.supabase.co http: https: ws: wss:",
    );
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("switches production script-src to a nonce when one is provided", () => {
    const policy = buildContentSecurityPolicy({
      nodeEnv: "production",
      nonce: "test-nonce",
      supabaseUrl: "https://project.supabase.co",
    });

    expect(getDirectiveValue(policy, "script-src")).toBe(
      "'self' 'nonce-test-nonce' 'strict-dynamic'",
    );
    expect(getDirectiveValue(policy, "style-src")).toBe(
      "'self' 'unsafe-inline'",
    );
  });

  it("builds a stricter report-only CSP without inline fallbacks", () => {
    const policy = buildContentSecurityPolicyReportOnly({
      contentSecurityPolicyReportUri: "/api/csp-report",
      nodeEnv: "production",
      supabaseUrl: "https://project.supabase.co",
    });

    expect(getDirectiveValue(policy, "script-src")).not.toContain(
      "'unsafe-inline'",
    );
    expect(getDirectiveValue(policy, "style-src")).toBe("'self'");
    expect(getDirectiveValue(policy, "report-uri")).toBe("/api/csp-report");
  });

  it("drops unsafe report-only CSP report destinations", () => {
    const policy = buildContentSecurityPolicyReportOnly({
      contentSecurityPolicyReportUri: "//collector.example/report",
      nodeEnv: "production",
      supabaseUrl: "https://project.supabase.co",
    });

    expect(getDirectiveValue(policy, "report-uri")).toBeNull();
  });

  it("keeps nonce-aware script reporting when report-only CSP is enabled", () => {
    const policy = buildContentSecurityPolicyReportOnly({
      nodeEnv: "production",
      nonce: "test-nonce",
      supabaseUrl: "https://project.supabase.co",
    });

    expect(getDirectiveValue(policy, "script-src")).toContain(
      "'nonce-test-nonce'",
    );
    expect(getDirectiveValue(policy, "script-src")).toContain(
      "'strict-dynamic'",
    );
    expect(getDirectiveValue(policy, "script-src")).not.toContain(
      "'unsafe-inline'",
    );
  });

  it("drops invalid Supabase URLs instead of emitting malformed origins", () => {
    const policy = buildContentSecurityPolicy({
      nodeEnv: "production",
      supabaseUrl: "not a url",
    });

    expect(getDirectiveValue(policy, "connect-src")).toBe("'self'");
    expect(getDirectiveValue(policy, "img-src")).not.toContain("not a url");
  });

  it("only emits HSTS in production", () => {
    expect(
      buildSecurityHeaders({
        nodeEnv: "production",
      }).some((header) => header.key === "Strict-Transport-Security"),
    ).toBe(true);

    expect(
      buildSecurityHeaders({
        nodeEnv: "development",
      }).some((header) => header.key === "Strict-Transport-Security"),
    ).toBe(false);
  });

  it("can emit the non-CSP headers on their own", () => {
    expect(
      buildSecurityHeaders({
        includeContentSecurityPolicy: false,
        nodeEnv: "production",
      }).some((header) => header.key === "Content-Security-Policy"),
    ).toBe(false);
  });

  it("emits report-only CSP only when explicitly enabled", () => {
    expect(
      buildSecurityHeaders({
        includeContentSecurityPolicyReportOnly: false,
        nodeEnv: "production",
      }).some((header) => header.key === "Content-Security-Policy-Report-Only"),
    ).toBe(false);

    const reportOnlyHeader = buildSecurityHeaders({
      contentSecurityPolicyReportUri: "/api/csp-report",
      includeContentSecurityPolicyReportOnly: true,
      nodeEnv: "production",
    }).find((header) => header.key === "Content-Security-Policy-Report-Only");

    expect(reportOnlyHeader?.value).toContain("report-uri /api/csp-report");
  });
});
