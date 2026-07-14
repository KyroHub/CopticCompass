import { describe, expect, it } from "vitest";

import {
  buildBrandedTransactionalEmailHtml,
  getMailFooterLines,
  getMarketingUnsubscribeLines,
  mailBrand,
  resendUnsubscribeUrlPlaceholder,
} from "./mailBrand";

describe("shared mail rendering", () => {
  it("builds localized branded footer lines from one source", () => {
    expect(getMailFooterLines("en")).toEqual([
      "Kind regards,",
      mailBrand.brandName,
      "A trusted digital Coptology platform.",
      `Continue reading on Coptic Compass: ${mailBrand.liveUrl}`,
    ]);
    expect(getMailFooterLines("nl")).toEqual([
      "Met vriendelijke groet,",
      mailBrand.brandName,
      "Een betrouwbaar digitaal Koptologieplatform.",
      `Verder lezen op Coptic Compass: ${mailBrand.liveUrl}`,
    ]);
  });

  it("keeps marketing unsubscribe copy explicit and localized", () => {
    expect(getMarketingUnsubscribeLines("en")).toEqual([
      "You are receiving this email because you subscribed to Coptic Compass updates.",
      "You can change your preferences or unsubscribe:",
      resendUnsubscribeUrlPlaceholder,
    ]);
    expect(getMarketingUnsubscribeLines("nl")).toContain(
      resendUnsubscribeUrlPlaceholder,
    );
  });

  it("escapes transactional fallback HTML without marketing unsubscribe text", () => {
    const html = buildBrandedTransactionalEmailHtml({
      subject: "<Welcome>",
      text: "Line 1\n<script>alert('x')</script>",
    });

    expect(html).toContain("&lt;Welcome&gt;");
    expect(html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(html).toContain(mailBrand.liveUrl);
    expect(html).not.toContain(resendUnsubscribeUrlPlaceholder);
  });
});
