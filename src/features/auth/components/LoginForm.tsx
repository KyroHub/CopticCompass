"use client";

import Link from "next/link";
import { FaGoogle } from "react-icons/fa";

import { login, signup, signInWithGoogle } from "@/actions/auth";
import { Button, buttonClassName } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { AuthFlashNoticeCleaner } from "@/features/auth/components/AuthFlashNoticeCleaner";
import type { TranslationKey } from "@/lib/i18n";

const NOTICE_TRANSLATION_KEYS = {
  "auth-unavailable": "login.notice.authUnavailable",
  "login-invalid-input": "login.notice.loginInvalidInput",
  "login-error": "login.notice.loginError",
  "login-rate-limited": "login.notice.loginRateLimited",
  "signup-check-email": "login.notice.signupCheckEmail",
  "signup-confirmed": "login.notice.signupConfirmed",
  "signup-error": "login.notice.signupError",
  "signup-invalid-input": "login.notice.signupInvalidInput",
  "signup-rate-limited": "login.notice.signupRateLimited",
} as const satisfies Record<string, TranslationKey>;

type NoticeState = keyof typeof NOTICE_TRANSLATION_KEYS;
type NoticeType = "error" | "success" | "info";

const NOTICE_VARIANTS = {
  "auth-unavailable": "error",
  "login-invalid-input": "error",
  "login-error": "error",
  "login-rate-limited": "error",
  "signup-check-email": "success",
  "signup-confirmed": "success",
  "signup-error": "error",
  "signup-invalid-input": "error",
  "signup-rate-limited": "error",
} as const satisfies Record<NoticeState, NoticeType>;

export function LoginForm({
  message,
  messageType = "error",
  redirectTo,
  state,
}: {
  message?: string;
  messageType?: NoticeType;
  redirectTo?: string;
  state?: string;
}) {
  const { language, t } = useLanguage();
  const noticeKey =
    state && state in NOTICE_TRANSLATION_KEYS
      ? NOTICE_TRANSLATION_KEYS[state as NoticeState]
      : undefined;
  const noticeMessage = noticeKey ? t(noticeKey) : message;
  const noticeVariant =
    state && state in NOTICE_VARIANTS
      ? NOTICE_VARIANTS[state as NoticeState]
      : messageType;

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
        title={t("login.title")}
        description={t("login.subtitle")}
        tone="brand"
        className="mb-12"
      />

      <AuthFlashNoticeCleaner />

      <div className="max-w-xl mx-auto">
        <SurfacePanel rounded="lg" className="p-8 md:p-10">
          <form className="space-y-6 text-ink">
            {redirectTo && (
              <input type="hidden" name="redirectTo" value={redirectTo} />
            )}
            <input type="hidden" name="locale" value={language} />

            <FormField htmlFor="email" label={t("login.email")}>
              <input
                id="email"
                className="input-base"
                name="email"
                type="email"
                placeholder={t("login.emailPlaceholder")}
                required
              />
            </FormField>

            <FormField
              htmlFor="password"
              label={
                <div className="flex items-center justify-between w-full">
                  <span>{t("login.password")}</span>
                  <Link
                    href="/forgot-password"
                    className={buttonClassName({ size: "sm", variant: "link" })}
                  >
                    {t("login.forgotPassword")}
                  </Link>
                </div>
              }
            >
              <input
                id="password"
                className="input-base"
                type="password"
                name="password"
                placeholder={t("login.passwordPlaceholder")}
                required
              />
            </FormField>

            <div className="space-y-3 pt-2">
              <Button formAction={login} fullWidth>
                {t("login.signIn")}
              </Button>
              <Button formAction={signup} fullWidth variant="secondary">
                {t("login.createAccount")}
              </Button>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-2 text-muted">
                  {t("login.orContinueWith")}
                </span>
              </div>
            </div>

            <Button
              formAction={signInWithGoogle}
              formNoValidate
              fullWidth
              variant="social"
            >
              <FaGoogle className="h-4 w-4 text-red-500" />
              {t("login.google")}
            </Button>

            {noticeMessage && (
              <StatusNotice tone={noticeVariant}>{noticeMessage}</StatusNotice>
            )}
          </form>
        </SurfacePanel>
      </div>
    </PageShell>
  );
}
