import Link from "next/link";

import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { SurfacePanel } from "@/components/SurfacePanel";
import {
  formatDashboardDate,
  getDashboardCopy,
} from "@/features/dashboard/lib/dashboardCopy";
import {
  getPartOfSpeechCode,
  getPartOfSpeechLabel,
  type DialectFilter,
} from "@/features/dictionary/config";
import type { EntryFavoriteWithEntry } from "@/features/dictionary/lib/entryActions";
import { getPreferredEntryDisplaySpelling } from "@/features/dictionary/lib/entryDisplay";
import { getPrimaryEntryPartOfSpeech } from "@/features/dictionary/lib/entryGrammar";
import { getEntryMeaningPreview } from "@/features/dictionary/lib/entryText";
import { getTranslation } from "@/lib/i18n";
import { getEntryPath } from "@/lib/locale";
import type { Language } from "@/types/i18n";

import { LinguisticGloss } from "./LinguisticGloss";

type DictionaryFavoritesOverviewProps = {
  favorites: readonly EntryFavoriteWithEntry[];
  language: Language;
  preferredDialect: DialectFilter;
};

function getMeaningPreview(
  language: Language,
  favorite: EntryFavoriteWithEntry,
) {
  if (!favorite.entry) {
    return null;
  }

  const previewMeanings = getEntryMeaningPreview(favorite.entry, language, 2);

  return previewMeanings.length > 0 ? previewMeanings.join("; ") : null;
}

export function DictionaryFavoritesOverview({
  favorites,
  language,
  preferredDialect,
}: DictionaryFavoritesOverviewProps) {
  const copy = getDashboardCopy(language);
  const availableFavorites = favorites.filter(({ entry }) => Boolean(entry));
  const missingFavorites = favorites.length - availableFavorites.length;

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-ink">
          {copy.dictionary.title}
        </h3>
        <p className="mt-2 text-muted">{copy.dictionary.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          [copy.dictionary.totalSaved, favorites.length],
          [copy.dictionary.availableEntries, availableFavorites.length],
          [copy.dictionary.missingEntries, missingFavorites],
        ].map(([label, value]) => (
          <SurfacePanel key={label} rounded="lg" className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
          </SurfacePanel>
        ))}
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          title={copy.dictionary.noSavedTitle}
          description={copy.dictionary.noSavedDescription}
        />
      ) : (
        <div className="grid gap-4">
          {favorites.map(({ entry, favorite }) => {
            const savedDate = formatDashboardDate(
              favorite.created_at,
              language,
            );
            const meaningPreview = getMeaningPreview(language, {
              entry,
              favorite,
            });

            return (
              <SurfacePanel
                key={`${favorite.user_id}:${favorite.entry_id}`}
                rounded="lg"
                className="p-6 md:p-7"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge tone={entry ? "coptic" : "neutral"} size="xs">
                        {entry
                          ? copy.dictionary.savedBadge
                          : copy.dictionary.missingBadge}
                      </Badge>
                      {entry ? (
                        <LinguisticGloss
                          code={getPartOfSpeechCode(
                            getPrimaryEntryPartOfSpeech(entry),
                          )}
                          label={getPartOfSpeechLabel(
                            getPrimaryEntryPartOfSpeech(entry),
                            (key) => getTranslation(language, key),
                          )}
                          size="body"
                        />
                      ) : null}
                    </div>

                    <h4
                      className={`font-coptic text-3xl tracking-wide text-coptic`}
                    >
                      {entry
                        ? getPreferredEntryDisplaySpelling(
                            entry,
                            preferredDialect,
                          )
                        : favorite.entry_id}
                    </h4>

                    {meaningPreview ? (
                      <p className="mt-3 max-w-3xl text-base leading-7 text-ink">
                        {meaningPreview}
                      </p>
                    ) : (
                      <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
                        {copy.dictionary.removedNotice}
                      </p>
                    )}

                    <p className="mt-4 text-sm text-muted">
                      {copy.dictionary.savedOnPrefix} {savedDate}
                    </p>
                  </div>

                  {entry ? (
                    <div className="flex shrink-0">
                      <Link
                        href={getEntryPath(entry.id, language)}
                        className={buttonClassName({ className: "px-5" })}
                      >
                        {copy.dictionary.viewEntry}
                      </Link>
                    </div>
                  ) : null}
                </div>
              </SurfacePanel>
            );
          })}
        </div>
      )}
    </section>
  );
}
