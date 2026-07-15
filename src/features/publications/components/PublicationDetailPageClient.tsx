"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SurfacePanel } from "@/components/SurfacePanel";
import { RelatedGrammarLessonsPanel } from "@/features/grammar/components/RelatedGrammarLessonsPanel";
import type { GrammarLessonReference } from "@/features/grammar/lib/grammarContentGraph";
import { PublicationImageGallery } from "@/features/publications/components/PublicationImageGallery";
import {
  PublicationBibliographicPanel,
  PublicationCatalogRecords,
  PublicationContributorsPanel,
  PublicationEditionsPanel,
  PublicationRightsDisclosure,
} from "@/features/publications/components/PublicationMetadataSections";
import {
  formatPublicationDate,
  getLocalizedPublicationText,
  getPublicationBindingLabel,
  getPublicationBindings,
  getPublicationContributorRoleLabel,
  getPublicationContributorsByRole,
  getPublicationFormatLabel,
  getPublicationPath,
  getPublicationPrimaryContributor,
  getPublicationPurchaseLinks,
  getPublicationYear,
  type Publication,
} from "@/features/publications/lib/publications";
import { getLocalizedHomePath, getPublicationsPath } from "@/lib/locale";

type PublicationDetailPageClientProps = {
  grammarLessons: readonly GrammarLessonReference[];
  publication: Publication;
  relatedPublications: readonly Publication[];
};

export default function PublicationDetailPageClient({
  grammarLessons,
  publication,
  relatedPublications,
}: PublicationDetailPageClientProps) {
  const { language, t } = useLanguage();
  const statusLabel =
    publication.status === "published"
      ? t("publications.status.published")
      : t("publications.status.forthcoming");
  const formatLabel = getPublicationFormatLabel(publication, language);
  const primaryContributor = getPublicationPrimaryContributor(publication);
  const primaryContributors = primaryContributor
    ? getPublicationContributorsByRole(publication, primaryContributor.role)
    : [];
  const firstEdition = publication.editions?.[0];
  const purchaseLinks = getPublicationPurchaseLinks(publication);
  const primaryAttribution = primaryContributor
    ? {
        label: getPublicationContributorRoleLabel(
          primaryContributor.role,
          language,
        ),
        names: primaryContributors
          .map((contributor) => contributor.name)
          .join(", "),
      }
    : null;

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-stack"
      width="standard"
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashInset,
      ]}
    >
      <div className="space-y-4">
        <BreadcrumbTrail
          items={[
            { label: t("nav.home"), href: getLocalizedHomePath(language) },
            {
              label: t("nav.publications"),
              href: getPublicationsPath(language),
            },
            { label: publication.title },
          ]}
        />

        <Link
          href={getPublicationsPath(language)}
          className={buttonClassName({
            className: "inline-flex gap-2",
            size: "md",
            variant: "secondary",
          })}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("publications.back")}
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <PublicationImageGallery
          key={publication.id}
          language={language}
          placeholderLabel={t("publications.coverPlaceholder")}
          publication={publication}
        />

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                tone={publication.status === "published" ? "accent" : "neutral"}
                size="sm"
              >
                {statusLabel}
              </Badge>
              <Badge
                tone={publication.lang === "COP" ? "coptic" : "surface"}
                size="sm"
              >
                {publication.lang}
              </Badge>
              <Badge tone="surface" size="sm">
                {formatLabel}
              </Badge>
            </div>

            <PageHeader
              align="left"
              title={publication.title}
              tone="brand"
              size="compact"
            />

            {publication.subtitle ? (
              <p className="text-lg font-semibold tracking-[0.01em] text-muted">
                {publication.subtitle}
              </p>
            ) : null}

            {primaryAttribution ? (
              <p className="text-base font-semibold text-ink">
                <span className="text-muted">{primaryAttribution.label}</span>
                {" · "}
                {primaryAttribution.names}
              </p>
            ) : null}

            {firstEdition ? (
              <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-medium text-muted">
                <span>
                  {getLocalizedPublicationText(
                    firstEdition.statement,
                    language,
                    publication.lang,
                  )}
                </span>
                {firstEdition.publicationDate ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {formatPublicationDate(
                        firstEdition.publicationDate,
                        language,
                      )}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}

            <p className="max-w-3xl text-lg leading-8 text-muted">
              {publication.summary[language]}
            </p>
          </div>

          <SurfacePanel rounded="lg" shadow="soft" className="p-6">
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {t("publications.status")}
                </dt>
                <dd className="mt-2 text-base font-semibold text-ink">
                  {statusLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {t("publications.language")}
                </dt>
                <dd className="mt-2 text-base font-semibold text-ink">
                  {publication.lang}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {t("publications.format")}
                </dt>
                <dd className="mt-2 text-base font-semibold text-ink">
                  {formatLabel}
                </dd>
              </div>
            </dl>
          </SurfacePanel>

          {purchaseLinks.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {purchaseLinks.map(({ binding, link }) => {
                const bindingLabel = binding
                  ? getPublicationBindingLabel(binding, language)
                  : null;
                const label = bindingLabel
                  ? `${t("publications.buy")} ${bindingLabel}`
                  : t("publications.externalLink");

                return (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label}${link.retailer ? ` — ${link.retailer}` : ""}`}
                    className={buttonClassName({
                      className: "inline-flex items-center gap-2 px-6",
                      size: "lg",
                      variant: "primary",
                    })}
                  >
                    <span>
                      {label}
                      {link.retailer ? (
                        <span className="block text-[11px] font-medium opacity-75">
                          {link.retailer}
                        </span>
                      ) : null}
                    </span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          ) : (
            <SurfacePanel rounded="lg" variant="subtle" className="p-5">
              <p className="text-sm leading-7 text-muted">
                {t("publications.noExternalLink")}
              </p>
            </SurfacePanel>
          )}
        </div>
      </div>

      <PublicationBibliographicPanel
        language={language}
        publication={publication}
        t={t}
      />

      <PublicationEditionsPanel
        language={language}
        publication={publication}
        t={t}
      />

      <PublicationContributorsPanel
        language={language}
        publication={publication}
        t={t}
      />

      <PublicationCatalogRecords
        language={language}
        publication={publication}
        t={t}
      />

      <PublicationRightsDisclosure
        language={language}
        publication={publication}
        t={t}
      />

      <RelatedGrammarLessonsPanel
        description={
          language === "nl"
            ? "Deze publicatie wordt rechtstreeks geciteerd of gebruikt in de volgende grammaticahandleidingen."
            : "This publication is cited or used directly in the following grammar lessons."
        }
        language={language}
        lessons={grammarLessons}
        title={
          language === "nl"
            ? "Vermeld in grammaticahandleidingen"
            : "Referenced in grammar lessons"
        }
      />

      {relatedPublications.length > 0 ? (
        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              {t("publications.related")}
            </h2>
            <p className="text-muted">{t("publications.relatedDesc")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {relatedPublications.map((relatedPublication) => {
              const contributor =
                getPublicationPrimaryContributor(relatedPublication);
              const metadata = [
                getPublicationYear(relatedPublication),
                ...getPublicationBindings(relatedPublication).map((binding) =>
                  getPublicationBindingLabel(binding, language),
                ),
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <Link
                  key={relatedPublication.id}
                  href={getPublicationPath(relatedPublication.id, language)}
                  className="group"
                >
                  <SurfacePanel
                    rounded="lg"
                    className="flex h-full flex-col justify-between p-5 transition-colors hover:border-accent/35"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="surface" size="xs">
                          {getPublicationFormatLabel(
                            relatedPublication,
                            language,
                          )}
                        </Badge>
                        <Badge
                          tone={
                            relatedPublication.status === "published"
                              ? "accent"
                              : "neutral"
                          }
                          size="xs"
                        >
                          {relatedPublication.status === "published"
                            ? t("publications.status.published")
                            : t("publications.status.forthcoming")}
                        </Badge>
                        <Badge
                          tone={
                            relatedPublication.lang === "COP"
                              ? "coptic"
                              : "surface"
                          }
                          size="xs"
                        >
                          {relatedPublication.lang}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-ink">
                          {relatedPublication.title}
                        </h3>
                        {relatedPublication.subtitle ? (
                          <p className="mt-1 text-sm text-muted">
                            {relatedPublication.subtitle}
                          </p>
                        ) : null}
                        {contributor ? (
                          <p className="mt-2 text-sm font-medium text-muted">
                            {contributor.name}
                          </p>
                        ) : null}
                        {metadata ? (
                          <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-muted">
                            {metadata}
                          </p>
                        ) : null}
                      </div>

                      <p className="text-sm leading-7 text-muted">
                        {relatedPublication.summary[language]}
                      </p>
                    </div>

                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-strong transition-colors group-hover:text-ink dark:text-accent dark:group-hover:text-accent-strong">
                      {t("publications.viewDetails")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </SurfacePanel>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
