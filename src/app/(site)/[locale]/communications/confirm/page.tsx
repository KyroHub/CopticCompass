import Link from "next/link";
import { connection } from "next/server";

import { confirmAudienceOptIn } from "@/actions/communications";
import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { Button, buttonClassName } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SurfacePanel } from "@/components/SurfacePanel";
import {
  getAudienceOptInRequestPreview,
  type AudienceOptInRequestStatus,
} from "@/features/communications/lib/server/optInRequests";
import { getTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import {
  getCommunicationPreferencesPath,
  getContactPath,
  getLocalizedHomePath,
} from "@/lib/locale";
import { createNoIndexMetadata } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);

  return createNoIndexMetadata({
    title: getTranslation(resolvedLocale, "contact.confirm.title"),
    description: getTranslation(resolvedLocale, "contact.confirm.pending"),
  });
}

const STATUS_MESSAGE_KEYS = {
  already_confirmed: "contact.confirm.alreadyConfirmed",
  confirmed: "contact.confirm.confirmed",
  expired: "contact.confirm.expired",
  invalid: "contact.confirm.invalid",
} as const satisfies Partial<
  Record<AudienceOptInRequestStatus, TranslationKey>
>;

function getStatusMessageKey(status: string | undefined): TranslationKey {
  return (
    STATUS_MESSAGE_KEYS[status as keyof typeof STATUS_MESSAGE_KEYS] ??
    "contact.confirm.invalid"
  );
}

/**
 * Renders a read-only token preview. Consent is recorded only by the form POST.
 */
export default async function CommunicationConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; token?: string }>;
}) {
  await connection();

  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  const { status, token } = await searchParams;
  const preview = status
    ? null
    : await getAudienceOptInRequestPreview(token ?? "");
  const resolvedStatus = status ?? preview?.status ?? "invalid";
  const pendingRequest =
    resolvedStatus === "pending" ? (preview?.request ?? null) : null;
  const messageKey = pendingRequest
    ? "contact.confirm.pending"
    : getStatusMessageKey(resolvedStatus);

  const requestedTopics = pendingRequest
    ? [
        pendingRequest.lessons_requested && "contact.topic.lessons",
        pendingRequest.books_requested && "contact.topic.books",
        pendingRequest.general_updates_requested && "contact.topic.general",
      ].filter((key): key is TranslationKey => Boolean(key))
    : [];

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
            {pendingRequest ? (
              <>
                <div className="mx-auto max-w-lg text-left">
                  <p className="text-sm font-semibold text-ink">
                    {getTranslation(
                      resolvedLocale,
                      "contact.confirm.requestedTopics",
                    )}
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
                    {requestedTopics.map((topicKey) => (
                      <li key={topicKey}>
                        {getTranslation(resolvedLocale, topicKey)}
                      </li>
                    ))}
                  </ul>
                </div>
                <form action={confirmAudienceOptIn}>
                  <input type="hidden" name="locale" value={resolvedLocale} />
                  <input type="hidden" name="token" value={token} />
                  <Button type="submit" className="px-6">
                    {getTranslation(
                      resolvedLocale,
                      "contact.confirm.confirmCta",
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-base leading-7 text-muted">
                {getTranslation(resolvedLocale, messageKey)}
              </p>
            )}

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={getLocalizedHomePath(resolvedLocale)}
                className={buttonClassName({
                  className: "px-6",
                  variant: "secondary",
                })}
              >
                {getTranslation(resolvedLocale, "contact.confirm.homeCta")}
              </Link>
              <Link
                href={getCommunicationPreferencesPath(resolvedLocale)}
                className={buttonClassName({
                  className: "px-6",
                  variant: "secondary",
                })}
              >
                {getTranslation(
                  resolvedLocale,
                  "contact.confirm.preferencesCta",
                )}
              </Link>
            </div>
          </div>
        </SurfacePanel>
      </div>
    </PageShell>
  );
}
