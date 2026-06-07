"use client";

import {
  ChevronDown,
  KeyRound,
  Mail,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { updatePasswordFromDashboard } from "@/actions/auth";
import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { CommunicationPreferencesForm } from "@/features/communications/components/CommunicationPreferencesForm";
import {
  getAudiencePreferences,
  type AudiencePreferencesRow,
} from "@/features/communications/lib/communications";
import {
  formatDashboardProviderDescription,
  getDashboardCopy,
} from "@/features/dashboard/lib/dashboardCopy";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { cx } from "@/lib/classes";
import { getContactPath, getPrivacyPath } from "@/lib/locale";
import type { Tables } from "@/types/supabase";

import type { ReactNode } from "react";

type AccountSettingsPanelProps = {
  audienceContact: AudiencePreferencesRow | null;
  canUpdatePassword: boolean;
  profile: Tables<"profiles">;
  providerLabel: string;
};

type AccountSectionId = "profile" | "password" | "communication" | "delete";

function AccountSettingsSection({
  badge,
  children,
  description,
  icon,
  isOpen,
  onToggle,
  title,
}: {
  badge?: ReactNode;
  children: ReactNode;
  description: string;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <section className="border-t border-line first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer select-none items-start gap-4 px-6 py-5 text-left transition-all duration-200 hover:bg-elevated/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30"
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong dark:text-accent">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-ink">{title}</h3>
            {badge}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
        <ChevronDown
          className={cx(
            "mt-1 h-5 w-5 shrink-0 text-muted transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen ? (
        <div className="border-t border-line px-6 py-6">{children}</div>
      ) : null}
    </section>
  );
}

function PasswordSettingsForm({
  canUpdatePassword,
  providerLabel,
}: {
  canUpdatePassword: boolean;
  providerLabel: string;
}) {
  const { language } = useLanguage();
  const copy = getDashboardCopy(language);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  function handleSubmit(formData: FormData) {
    setStatus(null);
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");

    if (password !== confirmPassword) {
      setStatus({ message: copy.account.passwordMismatch, type: "error" });
      return;
    }

    startTransition(async () => {
      const result = await updatePasswordFromDashboard(formData);
      if (result.success) {
        setStatus({
          message: copy.account.passwordUpdateSuccess,
          type: "success",
        });
        return;
      }

      setStatus({
        message: result.error || copy.account.passwordUpdateFailed,
        type: "error",
      });
    });
  }

  if (!canUpdatePassword) {
    return (
      <StatusNotice tone="info" align="left">
        {formatDashboardProviderDescription(
          copy.account.passwordManagedElsewhere,
          providerLabel,
        )}
      </StatusNotice>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-5 text-ink">
      <FormField htmlFor="password" label={copy.account.newPasswordLabel}>
        <input
          id="password"
          name="password"
          type="password"
          className="input-base"
          minLength={8}
          placeholder={copy.account.newPasswordPlaceholder}
          required
        />
      </FormField>

      <FormField
        htmlFor="confirm_password"
        label={copy.account.confirmPasswordLabel}
      >
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          className="input-base"
          minLength={8}
          placeholder={copy.account.confirmPasswordPlaceholder}
          required
        />
      </FormField>

      <p className="text-sm leading-6 text-muted">
        {copy.account.passwordHint}
      </p>

      <button
        type="submit"
        className={buttonClassName({ className: "px-6" })}
        disabled={isPending}
      >
        {isPending
          ? copy.account.updatePasswordPending
          : copy.account.updatePasswordIdle}
      </button>

      {status ? (
        <StatusNotice tone={status.type} align="left">
          {status.message}
        </StatusNotice>
      ) : null}
    </form>
  );
}

function DeleteProfileNotice() {
  const { language } = useLanguage();
  const copy = getDashboardCopy(language);

  return (
    <div className="space-y-5">
      <StatusNotice
        tone="error"
        align="left"
        title={copy.account.deleteNoticeTitle}
      >
        {copy.account.deleteNoticeLead}
      </StatusNotice>

      <div className="space-y-3 text-sm leading-6 text-muted">
        <p>{copy.account.deleteNoticeBody}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={getContactPath(language)}
          className={buttonClassName({ className: "px-6" })}
        >
          {copy.account.requestDeletion}
        </Link>
        <Link
          href={getPrivacyPath(language)}
          className={buttonClassName({
            className: "px-6",
            variant: "secondary",
          })}
        >
          {copy.account.reviewPrivacy}
        </Link>
      </div>
    </div>
  );
}

export function AccountSettingsPanel({
  audienceContact,
  canUpdatePassword,
  profile,
  providerLabel,
}: AccountSettingsPanelProps) {
  const { language } = useLanguage();
  const copy = getDashboardCopy(language);
  const [openSection, setOpenSection] = useState<AccountSectionId | null>(
    "profile",
  );
  const providerBadgeLabel = canUpdatePassword
    ? copy.account.passwordAvailableBadge
    : copy.account.passwordExternalBadge;
  const audiencePreferences = getAudiencePreferences(audienceContact, language);

  return (
    <SurfacePanel rounded="lg" className="overflow-hidden p-0">
      <div className="border-b border-line px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.account.eyebrow}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold text-ink">
            {copy.account.title}
          </h2>
          <Badge tone="surface" size="xs">
            {copy.account.privateBadge}
          </Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {copy.account.description}
        </p>
      </div>

      <AccountSettingsSection
        icon={<UserRound className="h-5 w-5" />}
        title={copy.account.profileTitle}
        description={copy.account.profileDescription}
        isOpen={openSection === "profile"}
        onToggle={() =>
          setOpenSection((current) =>
            current === "profile" ? null : "profile",
          )
        }
      >
        <ProfileForm profile={profile} embedded />
      </AccountSettingsSection>

      <AccountSettingsSection
        icon={<KeyRound className="h-5 w-5" />}
        title={copy.account.passwordTitle}
        description={
          canUpdatePassword
            ? copy.account.passwordDescription
            : formatDashboardProviderDescription(
                copy.account.passwordExternalDescription,
                providerLabel,
              )
        }
        badge={
          <Badge tone={canUpdatePassword ? "accent" : "neutral"} size="xs">
            {providerBadgeLabel}
          </Badge>
        }
        isOpen={openSection === "password"}
        onToggle={() =>
          setOpenSection((current) =>
            current === "password" ? null : "password",
          )
        }
      >
        <PasswordSettingsForm
          canUpdatePassword={canUpdatePassword}
          providerLabel={providerLabel}
        />
      </AccountSettingsSection>

      <AccountSettingsSection
        icon={<Mail className="h-5 w-5" />}
        title={copy.account.communicationTitle}
        description={copy.account.communicationDescription}
        badge={
          <Badge
            tone={
              audiencePreferences.booksOptIn ||
              audiencePreferences.generalUpdatesOptIn ||
              audiencePreferences.lessonsOptIn
                ? "accent"
                : "neutral"
            }
            size="xs"
          >
            {copy.account.communicationBadge}
          </Badge>
        }
        isOpen={openSection === "communication"}
        onToggle={() =>
          setOpenSection((current) =>
            current === "communication" ? null : "communication",
          )
        }
      >
        <CommunicationPreferencesForm
          deliveryEmail={profile.email}
          preferences={audiencePreferences}
        />
      </AccountSettingsSection>

      <AccountSettingsSection
        icon={<TriangleAlert className="h-5 w-5" />}
        title={copy.account.deleteTitle}
        description={copy.account.deleteDescription}
        badge={
          <Badge tone="neutral" size="xs">
            {copy.account.deleteBadge}
          </Badge>
        }
        isOpen={openSection === "delete"}
        onToggle={() =>
          setOpenSection((current) => (current === "delete" ? null : "delete"))
        }
      >
        <DeleteProfileNotice />
      </AccountSettingsSection>
    </SurfacePanel>
  );
}
