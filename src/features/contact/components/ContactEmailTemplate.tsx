import * as React from "react";

import { mailBrand, mailBrandColors } from "@/lib/communications/mailBrand";

type ContactEmailTemplateProps = {
  name: string;
  email: string;
  inquiryLabel: string;
  message: string;
};

export function ContactEmailTemplate({
  name,
  email,
  inquiryLabel,
  message,
}: ContactEmailTemplateProps) {
  return (
    <html>
      <body style={main}>
        <div style={container}>
          <p style={brandLine}>
            {mailBrand.brandName} • {mailBrand.descriptor}
          </p>
          <h2 style={heading}>
            {mailBrand.brandName} contact message: {inquiryLabel}
          </h2>
          <p style={paragraph}>
            <strong>From:</strong> {name}
          </p>
          <p style={paragraph}>
            <strong>Email:</strong> {email}
          </p>
          <p style={paragraph}>
            <strong>Platform:</strong> {mailBrand.brandName}
          </p>
          <hr style={hr} />
          <p style={{ ...paragraph, whiteSpace: "pre-wrap" }}>{message}</p>
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
  margin: "0 auto",
  padding: "28px 32px 48px",
  marginBottom: "64px",
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
  fontSize: "24px",
  letterSpacing: "0",
  lineHeight: "1.3",
  fontWeight: "600",
  color: mailBrandColors.ink,
  padding: "17px 0 0",
};

const paragraph = {
  margin: "0 0 15px",
  fontSize: "15px",
  lineHeight: "1.6",
  color: mailBrandColors.ink,
};

const hr = {
  borderColor: mailBrandColors.line,
  margin: "32px 0 24px",
};
