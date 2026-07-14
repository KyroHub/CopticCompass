import { connection } from "next/server";

import { updatePublicCommunicationPreferences } from "@/actions/communications";
import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { Button } from "@/components/Button";
import { CheckboxField } from "@/components/CheckboxField";
import { ElevatedPanel } from "@/components/ElevatedPanel";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { PreferenceLinkRequestForm } from "@/features/communications/components/PreferenceLinkRequestForm";
import { getAudiencePreferenceRequestPreview } from "@/features/communications/lib/server/preferenceRequests";
import { getTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { getLocalizedHomePath } from "@/lib/locale";
import { createNoIndexMetadata } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STATUS_KEYS = {
  already_used: "contact.preferences.alreadyUsed",
  expired: "contact.preferences.expired",
  invalid: "contact.preferences.invalid",
  updated: "contact.preferences.updated",
} as const satisfies Record<string, TranslationKey>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  return createNoIndexMetadata({
    title: getTranslation(resolvedLocale, "contact.preferences.title"),
    description: getTranslation(resolvedLocale, "contact.preferences.subtitle"),
  });
}

export default async function CommunicationPreferencesPage({
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
  const preview = token
    ? await getAudiencePreferenceRequestPreview(token)
    : null;
  const activeContact = preview?.status === "valid" ? preview.contact : null;
  const resolvedStatus =
    status ?? (preview && preview.status !== "valid" ? preview.status : null);
  const statusKey = resolvedStatus
    ? (STATUS_KEYS[resolvedStatus as keyof typeof STATUS_KEYS] ??
      "contact.preferences.invalid")
    : null;

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
              label: getTranslation(
                resolvedLocale,
                "contact.preferences.title",
              ),
            },
          ]}
        />
        <PageHeader
          title={getTranslation(resolvedLocale, "contact.preferences.title")}
          description={getTranslation(
            resolvedLocale,
            "contact.preferences.subtitle",
          )}
          tone="brand"
        />
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-6">
        {statusKey ? (
          <StatusNotice
            tone={resolvedStatus === "updated" ? "success" : "error"}
            align="left"
          >
            {getTranslation(resolvedLocale, statusKey)}
          </StatusNotice>
        ) : null}

        {activeContact ? (
          <SurfacePanel rounded="lg" className="p-8 md:p-10">
            <form
              action={updatePublicCommunicationPreferences}
              className="space-y-6"
            >
              <input type="hidden" name="locale" value={resolvedLocale} />
              <input type="hidden" name="token" value={token} />
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  {getTranslation(
                    resolvedLocale,
                    "contact.preferences.manageTitle",
                  )}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {getTranslation(
                    resolvedLocale,
                    "contact.preferences.manageHint",
                  )}
                </p>
              </div>
              <ElevatedPanel className="space-y-4 p-4">
                <CheckboxField
                  name="lessons_opt_in"
                  value="true"
                  defaultChecked={activeContact.lessons_opt_in}
                  label={getTranslation(
                    resolvedLocale,
                    "contact.topic.lessons",
                  )}
                />
                <CheckboxField
                  name="books_opt_in"
                  value="true"
                  defaultChecked={activeContact.books_opt_in}
                  label={getTranslation(resolvedLocale, "contact.topic.books")}
                />
                <CheckboxField
                  name="general_updates_opt_in"
                  value="true"
                  defaultChecked={activeContact.general_updates_opt_in}
                  label={getTranslation(
                    resolvedLocale,
                    "contact.topic.general",
                  )}
                />
              </ElevatedPanel>
              <Button type="submit" fullWidth>
                {getTranslation(resolvedLocale, "contact.preferences.saveCta")}
              </Button>
            </form>
          </SurfacePanel>
        ) : (
          <SurfacePanel rounded="lg" className="p-8 md:p-10">
            <PreferenceLinkRequestForm />
          </SurfacePanel>
        )}
      </div>
    </PageShell>
  );
}
