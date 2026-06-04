import "@/app/globals.css";
import { AppFrame } from "@/components/AppFrame";
import { ObservabilityScripts } from "@/components/ObservabilityScripts";
import { fontVariables } from "@/lib/fonts";
import { PUBLIC_LOCALES } from "@/lib/locale";
import { createRootLayoutMetadata } from "@/lib/metadata";
import { requirePublicLocale } from "@/lib/publicLocaleRouting";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = requirePublicLocale((await params).locale);
  return createRootLayoutMetadata(locale);
}

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

/**
 * Provides the static-friendly root layout for localized public pages while
 * enforcing a supported locale segment for the subtree.
 */
export default async function SiteLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const locale = requirePublicLocale((await params).locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={fontVariables}>
        <AppFrame initialLanguage={locale} localeRouting>
          {children}
        </AppFrame>
        <ObservabilityScripts language={locale} />
      </body>
    </html>
  );
}
