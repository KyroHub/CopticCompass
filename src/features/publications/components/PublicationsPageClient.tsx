"use client";

import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  FileClock,
  FileText,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AppPageIntro } from "@/components/AppPageIntro";
import { Badge } from "@/components/Badge";
import { iconButtonClassName } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import {
  FilterBar,
  FilterMenu,
  type FilterMenuOption,
} from "@/components/FilterMenu";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SurfacePanel, surfacePanelClassName } from "@/components/SurfacePanel";
import {
  getPublicationFormatLabel,
  getPublicationPath,
  publications,
} from "@/features/publications/lib/publications";
import type {
  LanguageBadge,
  Publication,
  PublicationStatus,
} from "@/features/publications/lib/publications";
import { getLocalizedHomePath } from "@/lib/locale";

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

function getCountLabel(count: number, itemLabel: string, itemsLabel: string) {
  return `${count} ${count === 1 ? itemLabel : itemsLabel}`;
}

function getSelectedFilterLabel(
  options: readonly FilterMenuOption[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function CatalogStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <SurfacePanel
      rounded="lg"
      shadow="soft"
      variant="elevated"
      className="flex items-center gap-4 p-5 text-left"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong dark:text-accent">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-widest text-muted">
          {label}
        </span>
        <span className="mt-1 block text-lg font-semibold text-ink">
          {value}
        </span>
      </span>
    </SurfacePanel>
  );
}

function PublicationsSearchBar({
  clearLabel,
  onQueryChange,
  placeholder,
  query,
}: {
  clearLabel: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  query: string;
}) {
  return (
    <div className="group relative z-30 rounded-lg border border-line bg-surface/92 shadow-panel backdrop-blur-xl">
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
          className="w-full rounded-lg bg-transparent p-4 pl-12 pr-14 text-base text-ink transition-all placeholder:text-muted/65 focus:outline-none focus:ring-2 focus:ring-accent/30 sm:p-5 sm:pl-14 sm:pr-16 sm:text-lg"
        />

        {query ? (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={() => onQueryChange("")}
            className={iconButtonClassName({
              className:
                "absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 border-transparent sm:right-4",
            })}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TileInner({
  pub,
  comingSoonLabel,
  externalAvailableLabel,
  formatLabel,
  priority = false,
  statusLabel,
  viewDetailsLabel,
}: {
  pub: Publication;
  comingSoonLabel: string;
  externalAvailableLabel: string;
  formatLabel: string;
  priority?: boolean;
  statusLabel: string;
  viewDetailsLabel: string;
}) {
  return (
    <>
      <div className="relative mb-5 aspect-[3/4.2] w-full overflow-hidden rounded-lg border border-line/80 bg-paper shadow-sm">
        {pub.image ? (
          <Image
            src={pub.image}
            alt={pub.title}
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

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge
          tone={pub.status === "published" ? "accent" : "neutral"}
          size="xs"
        >
          {statusLabel}
        </Badge>
        <Badge tone={pub.lang === "COP" ? "coptic" : "surface"} size="xs">
          {pub.lang}
        </Badge>
        <Badge tone="surface" size="xs">
          {formatLabel}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col justify-end">
        <h2 className="z-10 mb-1 line-clamp-3 text-lg font-bold leading-snug text-ink">
          {pub.title}
        </h2>
        {pub.subtitle && (
          <p className="z-10 mb-2 text-xs leading-snug text-muted">
            {pub.subtitle}
          </p>
        )}
        {pub.link && pub.status === "published" ? (
          <p className="z-10 mt-3 flex items-center text-sm font-medium text-muted">
            {externalAvailableLabel}
            <ArrowUpRight className="ml-1 h-4 w-4 translate-x-[-10px] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
          </p>
        ) : null}
        <p className="z-10 mt-5 flex items-center text-sm font-semibold text-accent-strong dark:text-accent">
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
        externalAvailableLabel={externalAvailableLabel}
        formatLabel={getPublicationFormatLabel(pub, language)}
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
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const activeFilterCount = [
    selectedLanguage !== "ALL",
    selectedStatus !== "ALL",
  ].filter(Boolean).length;
  const statusOptions: FilterMenuOption[] = statusFilterOptions.map(
    (status) => ({
      label:
        status === "ALL"
          ? t("publications.status.all")
          : t(`publications.status.${status}`),
      value: status,
    }),
  );
  const languageOptions: FilterMenuOption[] = languageFilterOptions.map(
    (languageOption) => ({
      label:
        languageOption === "ALL"
          ? t("publications.language.all")
          : languageOption,
      value: languageOption,
    }),
  );
  const filteredPublications = useMemo(
    () =>
      publications.filter((publication) => {
        if (
          selectedLanguage !== "ALL" &&
          publication.lang !== selectedLanguage
        ) {
          return false;
        }

        if (selectedStatus !== "ALL" && publication.status !== selectedStatus) {
          return false;
        }

        if (normalizedQuery.length === 0) {
          return true;
        }

        const searchableText = [
          publication.title,
          publication.subtitle,
          publication.lang,
          publication.status,
          publication.schemaType,
          publication.summary[language],
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();

        return searchableText.includes(normalizedQuery);
      }),
    [language, normalizedQuery, selectedLanguage, selectedStatus],
  );
  const publishedCount = publications.filter(
    (publication) => publication.status === "published",
  ).length;
  const forthcomingCount = publications.length - publishedCount;

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
        spacing="compact"
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
          />

          <FilterBar
            activeCount={activeFilterCount}
            clearLabel={t("publications.clearFilters")}
            defaultOpen="desktop"
            label={t("publications.filterToggle")}
            onClear={() => {
              setSelectedLanguage("ALL");
              setSelectedStatus("ALL");
            }}
          >
            <FilterMenu
              active={selectedStatus !== "ALL"}
              closeLabel={t("publications.hideFilters")}
              label={t("publications.status")}
              menuLabel={t("publications.status")}
              value={selectedStatus}
              valueLabel={getSelectedFilterLabel(statusOptions, selectedStatus)}
              options={statusOptions}
              onChange={(value) =>
                setSelectedStatus(value as PublicationStatusFilter)
              }
            />
            <FilterMenu
              active={selectedLanguage !== "ALL"}
              closeLabel={t("publications.hideFilters")}
              label={t("publications.language")}
              menuLabel={t("publications.language")}
              value={selectedLanguage}
              valueLabel={getSelectedFilterLabel(
                languageOptions,
                selectedLanguage,
              )}
              options={languageOptions}
              onChange={(value) =>
                setSelectedLanguage(value as PublicationLanguageFilter)
              }
            />
          </FilterBar>
        </div>

        <section className="hidden gap-3 md:grid md:grid-cols-3">
          <CatalogStat
            icon={BookOpen}
            label={t("publications.catalogLabel")}
            value={getCountLabel(
              publications.length,
              t("publications.item"),
              t("publications.items"),
            )}
          />
          <CatalogStat
            icon={FileText}
            label={t("publications.status.published")}
            value={getCountLabel(
              publishedCount,
              t("publications.item"),
              t("publications.items"),
            )}
          />
          <CatalogStat
            icon={FileClock}
            label={t("publications.status.forthcoming")}
            value={getCountLabel(
              forthcomingCount,
              t("publications.item"),
              t("publications.items"),
            )}
          />
        </section>

        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
