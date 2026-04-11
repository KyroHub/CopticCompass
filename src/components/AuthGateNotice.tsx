"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { cx } from "@/lib/classes";
import { getLoginPath } from "@/lib/supabase/config";

import type { ReactNode } from "react";

type AuthGateNoticeTone = "default" | "error" | "info" | "success";
type AuthGateNoticeSize = "compact" | "comfortable";
type AuthGateNoticeAlign = "left" | "center";

type AuthGateNoticeProps = {
  actionClassName?: string;
  actionLabel?: string;
  actionVariant?: "primary" | "secondary";
  align?: AuthGateNoticeAlign;
  children: ReactNode;
  className?: string;
  redirectTo?: string;
  size?: AuthGateNoticeSize;
  title?: ReactNode;
  tone?: AuthGateNoticeTone;
};

type AuthGateInlinePromptProps = {
  actionLabel?: string;
  className?: string;
  message: ReactNode;
  redirectTo?: string;
};

/**
 * Renders a consistent sign-in notice with a direct login action that returns
 * the user to the current route after authentication.
 */
export function AuthGateNotice({
  actionClassName,
  actionLabel,
  actionVariant = "primary",
  align = "center",
  children,
  className,
  redirectTo,
  size = "comfortable",
  title,
  tone = "info",
}: AuthGateNoticeProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const loginHref = getLoginPath(redirectTo ?? pathname ?? undefined);

  return (
    <StatusNotice
      align={align}
      className={className}
      size={size}
      title={title}
      tone={tone}
      actions={
        <Link
          href={loginHref}
          className={buttonClassName({
            className: actionClassName,
            variant: actionVariant,
          })}
        >
          {actionLabel ?? t("nav.login")}
        </Link>
      }
    >
      {children}
    </StatusNotice>
  );
}

/**
 * Provides a compact inline sign-in prompt for small feedback or helper
 * surfaces without introducing a full notice block.
 */
export function AuthGateInlinePrompt({
  actionLabel,
  className,
  message,
  redirectTo,
}: AuthGateInlinePromptProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const loginHref = getLoginPath(redirectTo ?? pathname ?? undefined);

  return (
    <p
      className={cx(
        "text-stone-500 dark:text-stone-400",
        className,
      )}
    >
      {message}{" "}
      <Link
        href={loginHref}
        className="font-semibold text-sky-600 transition-colors hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
      >
        {actionLabel ?? t("nav.login")}
      </Link>
      .
    </p>
  );
}
