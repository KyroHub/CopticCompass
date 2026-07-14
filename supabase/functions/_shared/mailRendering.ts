type MailLanguage = "en" | "nl";

/**
 * Runtime-neutral mail brand constants shared by Next.js and Supabase Edge
 * Functions. Keep this module free of framework imports and path aliases.
 */
export const mailBrand = {
  brandName: "Coptic Compass",
  descriptor: "Digital Coptology Platform",
  fromDisplayName: "Coptic Compass",
  founderLine: "by Kyrillos Wannes",
  liveUrl: "https://www.copticcompass.com",
} as const;

export const mailBrandColors = {
  coptic: "#008329",
  copticSoft: "#ecfaf0",
  elevated: "#f6f4ef",
  gold: "#ebc17d",
  goldSoft: "#fcf6eb",
  goldStrong: "#895918",
  ink: "#1e1d1d",
  line: "#e2ddd3",
  muted: "#5e584f",
  paper: "#f9f8f5",
  surface: "#ffffff",
} as const;

export const resendUnsubscribeUrlPlaceholder = "{{{RESEND_UNSUBSCRIBE_URL}}}";

function getMailFooterCopy(language: MailLanguage) {
  if (language === "nl") {
    return {
      browseLabel: "Verder lezen op Coptic Compass",
      descriptor: "Een betrouwbaar digitaal Koptologieplatform.",
      signoff: "Met vriendelijke groet,",
    };
  }

  return {
    browseLabel: "Continue reading on Coptic Compass",
    descriptor: "A trusted digital Coptology platform.",
    signoff: "Kind regards,",
  };
}

export function getMailFooterLines(language: MailLanguage) {
  const footer = getMailFooterCopy(language);

  return [
    footer.signoff,
    mailBrand.brandName,
    footer.descriptor,
    `${footer.browseLabel}: ${mailBrand.liveUrl}`,
  ];
}

export function getMarketingUnsubscribeLines(language: MailLanguage) {
  return language === "nl"
    ? [
        "U ontvangt deze e-mail omdat u zich hebt aangemeld voor updates van Coptic Compass.",
        "U kunt uw voorkeuren wijzigen of u uitschrijven:",
        resendUnsubscribeUrlPlaceholder,
      ]
    : [
        "You are receiving this email because you subscribed to Coptic Compass updates.",
        "You can change your preferences or unsubscribe:",
        resendUnsubscribeUrlPlaceholder,
      ];
}

export function escapeMailHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildBrandedTransactionalEmailHtml(options: {
  subject: string;
  text: string;
  language?: MailLanguage;
}) {
  const colors = mailBrandColors;
  const language = options.language ?? "en";
  const body = escapeMailHtml(options.text.trim()).replace(/\n/g, "<br />");
  const footerLines = getMailFooterLines(language);

  return `<!doctype html>
<html>
  <body style="margin:0;background:${colors.paper};padding:24px 12px;font-family:Aptos,Segoe UI,Helvetica Neue,Arial,sans-serif;color:${colors.ink};">
    <div style="max-width:640px;margin:0 auto;background:${colors.surface};border:1px solid ${colors.line};border-radius:10px;overflow:hidden;">
      <div style="height:6px;background:${colors.gold};"></div>
      <div style="padding:28px 32px;border-bottom:1px solid ${colors.line};">
        <div style="margin-bottom:14px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${colors.goldStrong};font-weight:700;">${escapeMailHtml(
          mailBrand.brandName,
        )} &bull; ${escapeMailHtml(mailBrand.descriptor)}</div>
        <h1 style="margin:0;font-size:24px;line-height:1.3;color:${colors.ink};">${escapeMailHtml(
          options.subject,
        )}</h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0;font-size:15px;line-height:1.7;color:${colors.ink};">${body}</p>
      </div>
      <div style="padding:24px 32px;border-top:1px solid ${colors.line};background:${colors.elevated};font-size:13px;line-height:1.7;color:${colors.muted};">
        <div>${escapeMailHtml(footerLines[0])}</div>
        <div style="font-weight:700;color:${colors.ink};">${escapeMailHtml(footerLines[1])}</div>
        <div>${escapeMailHtml(footerLines[2])}</div>
        <div style="margin-top:8px;"><a href="${mailBrand.liveUrl}" style="color:${colors.coptic};text-decoration:none;">${escapeMailHtml(footerLines[3])}</a></div>
      </div>
    </div>
  </body>
</html>`;
}
