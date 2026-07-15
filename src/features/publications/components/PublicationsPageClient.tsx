"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { AppPageIntro } from "@/components/AppPageIntro";
import { Badge } from "@/components/Badge";
import { buttonClassName, iconButtonClassName } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SegmentedControl } from "@/components/SegmentedControl";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import {
  buildPublicationSearchText,
  getLocalizedPublicationText,
  getPrimaryPublicationPurchaseLink,
  getPublicationBindingLabel,
  getPublicationBindings,
  getPublicationContributorRoleLabel,
  getPublicationImage,
  getPublicationPath,
  getPublicationPrimaryContributor,
  getPublicationVolumeLabel,
  getPublicationYear,
  publications,
  sortPublicationsForCatalog,
} from "@/features/publications/lib/publications";
import type {
  LanguageBadge,
  Publication,
  PublicationStatus,
} from "@/features/publications/lib/publications";
import { getLocalizedHomePath } from "@/lib/locale";
import type { Language } from "@/types/i18n";

type PublicationLanguageFilter = "ALL" | LanguageBadge;
type PublicationStatusFilter = "ALL" | PublicationStatus;

const languageFilterOptions: PublicationLanguageFilter[] = [
  "ALL",
  "COP",
  "NL",
  "EN",
];
const statusFilterOptions: PublicationStatusFilter[] = [
  "ALL",
  "published",
  "forthcoming",
];

function PublicationsSearchBar({
  clearLabel,
  onQueryChange,
  placeholder,
  query,
  trailingControls,
}: {
  clearLabel: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  query: string;
  trailingControls?: ReactNode;
}) {
  return (
    <div
      className={surfacePanelClassName({
        className: "group relative z-30 backdrop-blur-xl",
      })}
    >
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted transition-colors group-focus-within:text-coptic sm:left-5">
          <Search className="h-5 w-5" aria-hidden="true" />
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          enterKeyHint="search"
          className="w-full rounded-lg bg-transparent p-4 pl-12 pr-[8.5rem] text-base text-ink transition-all placeholder:text-muted/65 focus:outline-none focus:ring-2 focus:ring-accent/30 sm:p-5 sm:pl-14 sm:pr-[9rem] sm:text-lg"
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 sm:right-3">
          {query ? (
            <button
              type="button"
              aria-label={clearLabel}
              onClick={() => onQueryChange("")}
              className={iconButtonClassName({
                className:
                  "h-9 w-9 border-transparent text-muted hover:text-ink sm:h-10 sm:w-10",
              })}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
          {trailingControls}
        </div>
      </div>
    </div>
  );
}

function TileInner({
  pub,
  comingSoonLabel,
  contributorLabel,
  contributorName,
  externalAvailableLabel,
  hasPurchaseLink,
  language,
  metadataLine,
  priority = false,
  statusLabel,
  viewDetailsLabel,
}: {
  pub: Publication;
  comingSoonLabel: string;
  contributorLabel?: string;
  contributorName?: string;
  externalAvailableLabel: string;
  hasPurchaseLink: boolean;
  language: Language;
  metadataLine?: string;
  priority?: boolean;
  statusLabel: string;
  viewDetailsLabel: string;
}) {
  const coverImage = getPublicationImage(pub, "front-cover");
  const volumeBadge = getPublicationVolumeLabel(pub, language);

  return (
    <>
      <div className="relative mb-5 aspect-[3/4.2] w-full overflow-hidden rounded-lg border border-line/80 bg-paper shadow-sm">
        {coverImage ? (
          <Image
            src={coverImage.src}
            alt={getLocalizedPublicationText(
              coverImage.alt,
              language,
              pub.lang,
            )}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 268px, (min-width: 640px) calc((100vw - 6rem) / 2), calc(100vw - 3rem)"
            className="object-contain object-center p-2.5"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-elevated p-6">
            <div className="max-w-48 text-center">
              <Badge tone="surface" size="sm" caps>
                {comingSoonLabel}
              </Badge>
              <p className="mt-4 text-sm font-semibold leading-6 text-muted">
                {pub.title}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 flex min-h-6 content-start flex-wrap gap-2">
        <Badge
          tone={pub.status === "published" ? "accent" : "neutral"}
          size="xs"
        >
          {statusLabel}
        </Badge>
        <Badge tone={pub.lang === "COP" ? "coptic" : "surface"} size="xs">
          {pub.lang}
        </Badge>
        {volumeBadge ? (
          <Badge tone="surface" size="xs">
            {volumeBadge}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="min-h-[4.75rem]">
          <h2 className="z-10 line-clamp-3 text-lg font-bold leading-snug text-ink">
            {pub.title}
          </h2>
        </div>

        <div className="min-h-8">
          {contributorName ? (
            <p className="z-10 line-clamp-2 text-sm font-medium leading-4 text-ink">
              {contributorLabel ? (
                <span className="text-muted">{contributorLabel} · </span>
              ) : null}
              {contributorName}
            </p>
          ) : null}
        </div>

        <div className="min-h-4">
          {metadataLine ? (
            <p className="z-10 text-xs font-medium uppercase leading-4 tracking-[0.08em] text-muted">
              {metadataLine}
            </p>
          ) : null}
        </div>

        {hasPurchaseLink && pub.status === "published" ? (
          <p className="z-10 mt-2 flex items-center text-sm font-medium leading-5 text-muted">
            {externalAvailableLabel}
            <ArrowUpRight className="ml-1 h-4 w-4 translate-x-[-10px] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
          </p>
        ) : null}

        <p className="z-10 mt-auto flex items-center pt-5 text-sm font-semibold text-accent-strong dark:text-accent">
          {viewDetailsLabel}
          <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </p>
      </div>
    </>
  );
}

function PublicationTile({
  pub,
  comingSoonLabel,
  externalAvailableLabel,
  priority = false,
  viewDetailsLabel,
}: {
  pub: Publication;
  comingSoonLabel: string;
  externalAvailableLabel: string;
  priority?: boolean;
  viewDetailsLabel: string;
}) {
  const { language, t } = useLanguage();
  const baseClass = surfacePanelClassName({
    rounded: "lg",
    interactive: true,
    className:
      "group relative flex flex-col justify-between overflow-hidden p-5 md:p-6",
  });
  const statusLabel =
    pub.status === "published"
      ? t("publications.status.published")
      : t("publications.status.forthcoming");
  const primaryContributor = getPublicationPrimaryContributor(pub);
  const publicationYear = getPublicationYear(pub);
  const bindingLabels = getPublicationBindings(pub).map((binding) =>
    getPublicationBindingLabel(binding, language),
  );
  const metadataLine = [publicationYear, ...bindingLabels]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={getPublicationPath(pub.id, language)}
      prefetch={false}
      id={pub.id}
      className={`${baseClass} app-anchor-section scroll-mt-28 cursor-pointer`}
    >
      <TileInner
        pub={pub}
        comingSoonLabel={comingSoonLabel}
        contributorLabel={
          primaryContributor
            ? getPublicationContributorRoleLabel(
                primaryContributor.role,
                language,
              )
            : undefined
        }
        contributorName={primaryContributor?.name}
        externalAvailableLabel={externalAvailableLabel}
        hasPurchaseLink={Boolean(getPrimaryPublicationPurchaseLink(pub))}
        language={language}
        metadataLine={metadataLine || undefined}
        priority={priority}
        statusLabel={statusLabel}
        viewDetailsLabel={viewDetailsLabel}
      />
    </Link>
  );
}

export default function PublicationsPageClient() {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] =
    useState<PublicationLanguageFilter>("ALL");
  const [selectedStatus, setSelectedStatus] =
    useState<PublicationStatusFilter>("ALL");
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const activeFilterCount = [
    selectedLanguage !== "ALL",
    selectedStatus !== "ALL",
  ].filter(Boolean).length;
  const statusOptions = statusFilterOptions.map((status) => ({
    label:
      status === "ALL"
        ? t("publications.status.all")
        : t(`publications.status.${status}`),
    value: status,
  }));
  const languageOptions = languageFilterOptions.map((languageOption) => ({
    label:
      languageOption === "ALL"
        ? t("publications.language.all")
        : languageOption,
    value: languageOption,
  }));
  const filteredPublications = useMemo(
    () =>
      sortPublicationsForCatalog(
        publications.filter((publication) => {
          if (
            selectedLanguage !== "ALL" &&
            publication.lang !== selectedLanguage
          ) {
            return false;
          }

          if (
            selectedStatus !== "ALL" &&
            publication.status !== selectedStatus
          ) {
            return false;
          }

          if (normalizedQuery.length === 0) {
            return true;
          }

          const searchableText = buildPublicationSearchText(
            publication,
            language,
          );

          return searchableText.includes(normalizedQuery);
        }),
        language,
      ),
    [language, normalizedQuery, selectedLanguage, selectedStatus],
  );
  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content"
      width="standard"
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashInset,
      ]}
    >
      <AppPageIntro
        breadcrumbs={[
          { label: t("nav.home"), href: getLocalizedHomePath(language) },
          { label: t("nav.publications") },
        ]}
        title={t("nav.publications")}
      />

      <div className="space-y-8 md:space-y-9">
        <div className="app-sticky-panel relative isolate flex flex-col gap-3 md:gap-4">
          <PublicationsSearchBar
            clearLabel={t("publications.clearSearch")}
            onQueryChange={setQuery}
            placeholder={t("publications.searchPlaceholder")}
            query={query}
            trailingControls={
              <button
                type="button"
                onClick={() => setIsControlsOpen((current) => !current)}
                aria-expanded={isControlsOpen}
                aria-label={t("publications.filterToggle")}
                title={t("publications.filterToggle")}
                className={iconButtonClassName({
                  active: isControlsOpen,
                  className:
                    "relative h-9 w-9 border-transparent sm:h-10 sm:w-10",
                })}
              >
                <SlidersHorizontal className="h-5 w-5" />
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-ink px-1 text-[10px] font-bold leading-none text-paper ring-2 ring-surface dark:bg-elevated dark:text-ink dark:ring-surface">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            }
          />

          {isControlsOpen ? (
            <section
              className={surfacePanelClassName({
                variant: "elevated",
                shadow: "panel",
                className: "p-3 sm:p-4 z-20",
              })}
            >
              <div className="grid gap-4">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
                    {t("publications.filterToggle")}
                  </h2>
                  {activeFilterCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLanguage("ALL");
                        setSelectedStatus("ALL");
                      }}
                      className={buttonClassName({
                        className: "h-8 shrink-0 px-2.5 text-xs",
                        size: "sm",
                        variant: "ghost",
                      })}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("publications.clearFilters")}
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-col gap-0">
                  <div className="grid gap-3 md:grid-cols-[8rem_minmax(0,1fr)] md:items-center py-4">
                    <h3 className="flex h-11 items-center text-xs font-semibold uppercase tracking-widest text-muted">
                      {t("publications.status")}
                    </h3>
                    <SegmentedControl
                      className="w-full min-w-0"
                      controlClassName="mt-0"
                      label={t("publications.status")}
                      labelClassName="sr-only"
                      layout="wrap"
                      onChange={(value) =>
                        setSelectedStatus(value as PublicationStatusFilter)
                      }
                      options={statusOptions}
                      tone="neutral"
                      value={selectedStatus}
                      variant="flush"
                    />
                  </div>
                  <div className="grid gap-3 border-t border-line py-4 md:grid-cols-[8rem_minmax(0,1fr)] md:items-center">
                    <h3 className="flex h-11 items-center text-xs font-semibold uppercase tracking-widest text-muted">
                      {t("publications.language")}
                    </h3>
                    <SegmentedControl
                      className="w-full min-w-0"
                      controlClassName="mt-0"
                      label={t("publications.language")}
                      labelClassName="sr-only"
                      layout="wrap"
                      onChange={(value) =>
                        setSelectedLanguage(value as PublicationLanguageFilter)
                      }
                      options={languageOptions}
                      tone="neutral"
                      value={selectedLanguage}
                      variant="flush"
                    />
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPublications.map((pub, i) => (
            <PublicationTile
              key={pub.id}
              pub={pub}
              comingSoonLabel={t("home.comingSoon")}
              externalAvailableLabel={t("publications.externalAvailable")}
              priority={i === 0}
              viewDetailsLabel={t("publications.viewDetails")}
            />
          ))}
        </div>

        {filteredPublications.length === 0 ? (
          <EmptyState
            title={t("publications.noResults")}
            description={t("publications.noResultsDesc")}
          />
        ) : null}
      </div>
    </PageShell>
  );
}
