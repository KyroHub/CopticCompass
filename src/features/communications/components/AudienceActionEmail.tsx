import * as React from "react";

import { mailBrand, mailBrandColors } from "@/lib/communications/mailBrand";

type AudienceActionEmailProps = {
  actionUrl: string;
  body: string;
  cta: string;
  fallback: string;
  footerNote: string;
  greeting: string;
  recipientName?: string | null;
  title: string;
  topicSummary?: string;
};

/** Shared branded shell for transactional audience action emails. */
export function AudienceActionEmail({
  actionUrl,
  body,
  cta,
  fallback,
  footerNote,
  greeting,
  recipientName,
  title,
  topicSummary,
}: AudienceActionEmailProps) {
  const normalizedName = recipientName?.trim();

  return (
    <html>
      <body style={main}>
        <div style={container}>
          <p style={brandLine}>
            {mailBrand.brandName} • {mailBrand.descriptor}
          </p>
          <h2 style={heading}>{title}</h2>
          <p style={paragraph}>
            {greeting}
            {normalizedName ? ` ${normalizedName}` : ""},
          </p>
          <p style={paragraph}>{body}</p>
          {topicSummary ? <p style={paragraph}>{topicSummary}</p> : null}
          <a href={actionUrl} style={button}>
            {cta}
          </a>
          <hr style={hr} />
          <p style={paragraph}>{fallback}</p>
          <a href={actionUrl} style={link}>
            {actionUrl}
          </a>
          <p style={footer}>
            {mailBrand.brandName}
            <br />
            {mailBrand.descriptor}
          </p>
          <p style={footer}>{footerNote}</p>
        </div>
      </body>
    </html>
  );
}

const main = {
  backgroundColor: mailBrandColors.paper,
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: mailBrandColors.surface,
  border: `1px solid ${mailBrandColors.line}`,
  borderRadius: "10px",
  margin: "0 auto 64px",
  padding: "28px 32px 48px",
};

const brandLine = {
  borderTop: `6px solid ${mailBrandColors.gold}`,
  color: mailBrandColors.goldStrong,
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  margin: "-28px -32px 24px",
  padding: "18px 32px 0",
  textTransform: "uppercase" as const,
};

const heading = {
  color: mailBrandColors.ink,
  fontSize: "24px",
  fontWeight: "600",
  letterSpacing: "0",
  lineHeight: "1.3",
  padding: "17px 0 0",
};

const paragraph = {
  color: mailBrandColors.ink,
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 15px",
};

const hr = { borderColor: mailBrandColors.line, margin: "32px 0 20px" };

const button = {
  backgroundColor: mailBrandColors.ink,
  borderRadius: "8px",
  color: mailBrandColors.paper,
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600",
  padding: "14px 24px",
  textDecoration: "none",
};

const link = {
  color: mailBrandColors.coptic,
  fontSize: "13px",
  lineHeight: "1.6",
  wordBreak: "break-all" as const,
};

const footer = {
  color: mailBrandColors.muted,
  fontSize: "13px",
  lineHeight: "1.6",
  marginTop: "24px",
};
