import { redirect } from "next/navigation";

import { logout } from "@/actions/auth";
import { AppPageIntro } from "@/components/AppPageIntro";
import { buttonClassName } from "@/components/Button";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { DashboardPracticePanel } from "@/features/dashboard/components/DashboardPracticePanel";
import { DashboardRecentExercisesSection } from "@/features/dashboard/components/DashboardRecentExercisesSection";
import { DashboardWelcomePanel } from "@/features/dashboard/components/DashboardWelcomePanel";
import { getDashboardCopy } from "@/features/dashboard/lib/dashboardCopy";
import { loadDashboardPageData } from "@/features/dashboard/lib/server/pageData";
import { DictionaryFavoritesOverview } from "@/features/dictionary/components/DictionaryFavoritesOverview";
import { DEFAULT_DICTIONARY_DIALECT_FILTER } from "@/features/dictionary/config";
import { GrammarDashboardOverview } from "@/features/grammar/components/GrammarDashboardOverview";
import { AccountSettingsPanel } from "@/features/profile/components/AccountSettingsPanel";
import { getTranslation } from "@/lib/i18n";
import { getDashboardPath, getLocalizedHomePath } from "@/lib/locale";
import { requireAuthenticatedPageSession } from "@/lib/supabase/auth";
import { getLoginPath } from "@/lib/supabase/config";
import type { Language } from "@/types/i18n";

type DashboardPageContentProps = {
  locale: Language;
};

export async function DashboardPageContent({
  locale,
}: DashboardPageContentProps) {
  const dashboardPath = getDashboardPath(locale);
  const copy = getDashboardCopy(locale);
  const { supabase, user } =
    await requireAuthenticatedPageSession(dashboardPath);
  const dashboardData = await loadDashboardPageData({
    locale,
    supabase,
    user,
  });
  if (!dashboardData) {
    return redirect(getLoginPath(dashboardPath));
  }

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content min-h-[80vh]"
      width="standard"
      accents={[
        pageShellAccents.topLeftGoldWashInset,
        pageShellAccents.bottomRightCopticWash,
      ]}
    >
      <AppPageIntro
        actions={
          <form action={logout}>
            <input type="hidden" name="redirectTo" value={dashboardPath} />
            <button
              className={buttonClassName({
                className: "px-6",
                variant: "secondary",
              })}
            >
              {copy.signOut}
            </button>
          </form>
        }
        breadcrumbs={[
          {
            label: getTranslation(locale, "nav.home"),
            href: getLocalizedHomePath(locale),
          },
          { label: getTranslation(locale, "nav.dashboard") },
        ]}
        description={copy.pageDescription}
        title={copy.pageTitle}
      />

      <div className="flex flex-col gap-12">
        <DashboardWelcomePanel
          locale={locale}
          profile={dashboardData.profile}
        />

        <AccountSettingsPanel
          audienceContact={dashboardData.audienceContact}
          canUpdatePassword={dashboardData.canUpdatePassword}
          profile={dashboardData.profile}
          providerLabel={dashboardData.providerLabel}
        />

        <GrammarDashboardOverview
          language={locale}
          lessonSummaries={dashboardData.grammarLessonSummaries}
        />

        <DashboardPracticePanel
          language={locale}
          nextDueAt={dashboardData.practice.deck.nextDueAt}
          stats={dashboardData.practice.deck.stats}
          storageError={dashboardData.practice.storageError}
        />

        <DictionaryFavoritesOverview
          favorites={dashboardData.savedDictionaryEntries}
          language={locale}
          preferredDialect={
            dashboardData.profile.preferred_dictionary_dialect ??
            DEFAULT_DICTIONARY_DIALECT_FILTER
          }
        />

        <DashboardRecentExercisesSection
          locale={locale}
          submissions={dashboardData.submissions}
        />
      </div>
    </PageShell>
  );
}
