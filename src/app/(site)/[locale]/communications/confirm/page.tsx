import Link from "next/link";

import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { buttonClassName } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SurfacePanel } from "@/components/SurfacePanel";
import { confirmAudienceOptInRequest } from "@/lib/communications/optInRequests";
import { getTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { getContactPath, getLocalizedHomePath } from "@/lib/locale";
import { createNoIndexMetadata } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);

  return createNoIndexMetadata({
    title: getTranslation(resolvedLocale, "contact.confirm.title"),
    description: getTranslation(resolvedLocale, "contact.confirm.confirmed"),
  });
}

/**
 * Confirms one audience opt-in token and renders the localized confirmation
 * result page.
 */
export default async function CommunicationConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  const { token } = await searchParams;
  const confirmationResult = await confirmAudienceOptInRequest(token ?? "");
  let messageKey: TranslationKey = "contact.confirm.invalid";

  switch (confirmationResult.status) {
    case "confirmed":
      messageKey = "contact.confirm.confirmed";
      break;
    case "already_confirmed":
      messageKey = "contact.confirm.alreadyConfirmed";
      break;
    case "expired":
      messageKey = "contact.confirm.expired";
      break;
    default:
      break;
  }

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content"
      width="standard"
      accents={[
        pageShellAccents.topLeftGoldWash,
        pageShellAccents.bottomRightCopticWash,
      ]}
    >
      <div className="app-page-heading">
        <BreadcrumbTrail
          items={[
            {
              label: getTranslation(resolvedLocale, "nav.home"),
              href: getLocalizedHomePath(resolvedLocale),
            },
            {
              label: getTranslation(resolvedLocale, "nav.contact"),
              href: getContactPath(resolvedLocale),
            },
            { label: getTranslation(resolvedLocale, "contact.confirm.title") },
          ]}
        />
        <PageHeader
          title={getTranslation(resolvedLocale, "contact.confirm.title")}
          description={getTranslation(resolvedLocale, messageKey)}
          tone="brand"
        />
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <SurfacePanel rounded="lg" className="p-8 md:p-10">
          <div className="space-y-6 text-center">
            <p className="text-base leading-7 text-muted">
              {getTranslation(resolvedLocale, messageKey)}
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={getLocalizedHomePath(resolvedLocale)}
                className={buttonClassName({ className: "px-6" })}
              >
                {getTranslation(resolvedLocale, "contact.confirm.homeCta")}
              </Link>
              <Link
                href={getContactPath(resolvedLocale)}
                className={buttonClassName({
                  className: "px-6",
                  variant: "secondary",
                })}
              >
                {getTranslation(resolvedLocale, "contact.confirm.contactCta")}
              </Link>
            </div>
          </div>
        </SurfacePanel>
      </div>
    </PageShell>
  );
}
