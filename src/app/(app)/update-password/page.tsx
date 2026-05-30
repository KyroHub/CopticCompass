import Link from "next/link";

import { updatePassword } from "@/actions/auth";
import { Button, buttonClassName } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { AuthFlashNoticeCleaner } from "@/features/auth/components/AuthFlashNoticeCleaner";
import { getTranslation } from "@/lib/i18n";
import { getDashboardPath } from "@/lib/locale";
import { createNoIndexMetadata } from "@/lib/metadata";
import { getPreferredLanguage } from "@/lib/server/preferredLanguage";
import { requireAuthenticatedPageSession } from "@/lib/supabase/auth";

import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getPreferredLanguage();

  return createNoIndexMetadata({
    title: getTranslation(language, "update.metaTitle"),
    description: getTranslation(language, "update.metaDescription"),
  });
}

/**
 * Renders the authenticated password-update page for the non-localized auth
 * surface.
 */
export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    messageType?: "error" | "success" | "info";
    state?: string;
  }>;
}) {
  const language = await getPreferredLanguage();
  await requireAuthenticatedPageSession("/update-password");

  const noticeMessages: Record<string, string> = {
    "update-invalid-input": getTranslation(
      language,
      "update.notice.invalidInput",
    ),
    "update-error": getTranslation(language, "update.notice.error"),
    "update-rate-limited": getTranslation(
      language,
      "update.notice.rateLimited",
    ),
  };
  const { messageType = "error", state } = await searchParams;
  const noticeMessage =
    state && state in noticeMessages ? noticeMessages[state] : undefined;
  const noticeVariant = messageType;

  return (
    <PageShell
      className="app-form-shell"
      contentClassName="pt-8"
      width="narrow"
      accents={[
        pageShellAccents.topLeftGoldWash,
        pageShellAccents.bottomRightCopticWash,
      ]}
    >
      <PageHeader
        title={getTranslation(language, "update.title")}
        description={getTranslation(language, "update.subtitle")}
        tone="brand"
        className="mb-12"
      />

      <AuthFlashNoticeCleaner />

      <div className="mx-auto max-w-xl">
        <SurfacePanel rounded="lg" className="p-8 md:p-10">
          <form className="space-y-6 text-ink">
            <FormField
              htmlFor="password"
              label={getTranslation(language, "update.password")}
            >
              <input
                id="password"
                className="input-base"
                type="password"
                name="password"
                minLength={8}
                placeholder={getTranslation(
                  language,
                  "update.passwordPlaceholder",
                )}
                required
              />
            </FormField>

            <div className="space-y-3 pt-2">
              <Button formAction={updatePassword} fullWidth>
                {getTranslation(language, "update.submit")}
              </Button>
              <Link
                href={getDashboardPath(language)}
                className={buttonClassName({
                  className: "w-full justify-center",
                  variant: "link",
                })}
              >
                {getTranslation(language, "update.backToDashboard")}
              </Link>
            </div>

            {noticeMessage && (
              <StatusNotice tone={noticeVariant}>{noticeMessage}</StatusNotice>
            )}
          </form>
        </SurfacePanel>
      </div>
    </PageShell>
  );
}
