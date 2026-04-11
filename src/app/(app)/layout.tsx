import { connection } from "next/server";

import "@/app/globals.css";
import { AppFrame } from "@/components/AppFrame";
import { ObservabilityScripts } from "@/components/ObservabilityScripts";
import { antinoou } from "@/lib/fonts";
import { createRootLayoutMetadata } from "@/lib/metadata";
import { getCspNonce } from "@/lib/server/csp";
import { withScalabilityTimer } from "@/lib/server/observability";
import { getPreferredLanguage } from "@/lib/server/preferredLanguage";

import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getPreferredLanguage();
  return createRootLayoutMetadata(language);
}

/**
 * Serves as the request-bound root layout for the non-localized app shell so
 * nonce-based CSP and preferred-language resolution stay isolated away from
 * the static localized site surface.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [language, nonce] = await withScalabilityTimer(
    "layout.app.request_bound",
    async () => {
      await connection();
      return Promise.all([getPreferredLanguage(), getCspNonce()]);
    },
    {
      summarizeResult: ([resolvedLanguage, resolvedNonce]) => ({
        documentLanguage: resolvedLanguage,
        hasNonce: Boolean(resolvedNonce),
      }),
    },
  );

  return (
    <html lang={language} suppressHydrationWarning>
      <body className={antinoou.variable}>
        <AppFrame initialLanguage={language} nonce={nonce}>
          {children}
        </AppFrame>
        <ObservabilityScripts />
      </body>
    </html>
  );
}
