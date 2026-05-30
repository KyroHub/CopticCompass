import Link from "next/link";

import { resetPassword } from "@/actions/auth";
import { Button, buttonClassName } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { AuthFlashNoticeCleaner } from "@/features/auth/components/AuthFlashNoticeCleaner";
import { getTranslation } from "@/lib/i18n";
import { createNoIndexMetadata } from "@/lib/metadata";
import { getPreferredLanguage } from "@/lib/server/preferredLanguage";

import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getPreferredLanguage();

  return createNoIndexMetadata({
    title: getTranslation(language, "forgot.metaTitle"),
    description: getTranslation(language, "forgot.metaDescription"),
  });
}

/**
 * Renders the password-reset request page for the non-localized auth surface.
 */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    messageType?: "error" | "success" | "info";
    state?: string;
  }>;
}) {
  const language = await getPreferredLanguage();
  const noticeMessages: Record<string, string> = {
    "forgot-invalid-input": getTranslation(
      language,
      "forgot.notice.invalidInput",
    ),
    "forgot-error": getTranslation(language, "forgot.notice.error"),
    "forgot-rate-limited": getTranslation(
      language,
      "forgot.notice.rateLimited",
    ),
    "forgot-success": getTranslation(language, "forgot.notice.success"),
  };
  const { messageType = "error", state } = await searchParams;
  const noticeMessage =
    state && state in noticeMessages ? noticeMessages[state] : undefined;
  const noticeVariant = state === "forgot-success" ? "success" : messageType;

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
        title={getTranslation(language, "forgot.title")}
        description={getTranslation(language, "forgot.subtitle")}
        tone="brand"
        className="mb-12"
      />

      <AuthFlashNoticeCleaner />

      <div className="mx-auto max-w-xl">
        <SurfacePanel rounded="lg" className="p-8 md:p-10">
          <form className="space-y-6 text-ink">
            <FormField
              htmlFor="email"
              label={getTranslation(language, "forgot.email")}
            >
              <input
                id="email"
                className="input-base"
                name="email"
                type="email"
                placeholder={getTranslation(
                  language,
                  "forgot.emailPlaceholder",
                )}
                required
              />
            </FormField>

            <div className="space-y-3 pt-2">
              <Button formAction={resetPassword} fullWidth>
                {getTranslation(language, "forgot.sendLink")}
              </Button>
              <Link
                href="/login"
                className={buttonClassName({
                  className: "w-full justify-center",
                  variant: "link",
                })}
              >
                {getTranslation(language, "forgot.backToSignIn")}
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
