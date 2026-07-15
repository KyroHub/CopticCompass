import { ArrowUpRight, ChevronDown, Mail } from "lucide-react";

import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { SurfacePanel } from "@/components/SurfacePanel";
import {
  formatPublicationDate,
  formatPublicationDimensions,
  getLocalizedPublicationText,
  getPublicationBindingLabel,
  getPublicationContributorRoleLabel,
  getPublicationContributorsByRole,
  getPublicationPlaceLabel,
  getPublicationPrimaryContributor,
  type Publication,
  type PublicationContributorRole,
} from "@/features/publications/lib/publications";
import type { TranslationKey } from "@/lib/i18n";
import { getLocalizedPath } from "@/lib/locale";
import type { Language } from "@/types/i18n";

import type { ReactNode } from "react";

type Translate = (key: TranslationKey) => string;

type PublicationMetadataProps = {
  language: Language;
  publication: Publication;
  t: Translate;
};

const CONTRIBUTOR_ROLE_KEYS: Record<
  PublicationContributorRole,
  TranslationKey
> = {
  author: "publications.role.author",
  editor: "publications.role.editor",
  compiler: "publications.role.compiler",
  illustrator: "publications.role.illustrator",
  foreword: "publications.role.foreword",
  "cover-design": "publications.role.coverDesign",
  typesetting: "publications.role.typesetting",
  translator: "publications.role.translator",
};

function SectionHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
      <p className="max-w-3xl text-sm leading-7 text-muted sm:text-base">
        {description}
      </p>
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted">
        {label}
      </dt>
      <dd className="mt-2 text-base font-semibold leading-7 text-ink">
        {value}
      </dd>
    </div>
  );
}

export function PublicationBibliographicPanel({
  language,
  publication,
  t,
}: PublicationMetadataProps) {
  const primaryContributor = getPublicationPrimaryContributor(publication);
  const primaryContributors = primaryContributor
    ? getPublicationContributorsByRole(publication, primaryContributor.role)
    : [];
  const firstEdition = publication.editions?.[0];
  const fields: Array<{ label: string; value: ReactNode }> = [];

  if (primaryContributor) {
    fields.push({
      label: getPublicationContributorRoleLabel(
        primaryContributor.role,
        language,
      ),
      value: primaryContributors
        .map((contributor) => contributor.name)
        .join(", "),
    });
  }

  if (publication.publisher) {
    fields.push({
      label: t("publications.publisher"),
      value: publication.publisher.url ? (
        <a
          href={publication.publisher.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-accent-strong hover:underline dark:text-accent"
        >
          {publication.publisher.name}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : (
        publication.publisher.name
      ),
    });
  }

  if (firstEdition) {
    fields.push({
      label: t("publications.edition"),
      value: getLocalizedPublicationText(
        firstEdition.statement,
        language,
        publication.lang,
      ),
    });
  }

  if (firstEdition?.publicationDate) {
    fields.push({
      label: t("publications.publicationDate"),
      value: formatPublicationDate(firstEdition.publicationDate, language),
    });
  }

  if (firstEdition?.publicationPlace) {
    fields.push({
      label: t("publications.publicationPlace"),
      value: getPublicationPlaceLabel(
        firstEdition.publicationPlace,
        language,
        publication.lang,
      ),
    });
  }

  if (publication.series?.volumeNumber) {
    fields.push({
      label: t("publications.volume"),
      value: publication.series.volumeNumber,
    });
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5">
      <SectionHeading
        title={t("publications.bibliographicDetails")}
        description={t("publications.bibliographicDetailsDesc")}
      />
      <SurfacePanel rounded="lg" shadow="soft" className="p-6 md:p-7">
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <MetadataItem
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
        </dl>
      </SurfacePanel>
    </section>
  );
}

export function PublicationEditionsPanel({
  language,
  publication,
  t,
}: PublicationMetadataProps) {
  if (!publication.editions?.length) {
    return null;
  }

  return (
    <section className="space-y-5">
      <SectionHeading
        title={t("publications.availableFormats")}
        description={t("publications.availableFormatsDesc")}
      />

      <div className="space-y-5">
        {publication.editions.map((edition) => (
          <SurfacePanel
            key={edition.id}
            as="article"
            backdropBlur={false}
            rounded="lg"
            shadow="soft"
            className="overflow-hidden"
          >
            <header className="border-b border-line px-5 py-5 sm:px-6">
              <h3 className="text-lg font-bold text-ink">
                {getLocalizedPublicationText(
                  edition.statement,
                  language,
                  publication.lang,
                )}
              </h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                {edition.publicationDate ? (
                  <span>
                    {formatPublicationDate(edition.publicationDate, language)}
                  </span>
                ) : null}
                {edition.publicationPlace ? (
                  <span>
                    {getPublicationPlaceLabel(
                      edition.publicationPlace,
                      language,
                      publication.lang,
                    )}
                  </span>
                ) : null}
              </div>
            </header>

            <div className="divide-y divide-line">
              {edition.formats.map((format) => {
                const purchaseLinks = (format.links ?? []).filter(
                  (link) => link.kind === "purchase",
                );
                const bindingLabel = getPublicationBindingLabel(
                  format.binding,
                  language,
                );

                return (
                  <div
                    key={format.id}
                    className="grid gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center"
                  >
                    <div className="min-w-0 space-y-4">
                      <Badge tone="neutral" size="sm">
                        {bindingLabel}
                      </Badge>

                      <dl className="grid gap-5 sm:grid-cols-2">
                        {format.isbn13 ? (
                          <MetadataItem
                            label={t("publications.isbn")}
                            value={format.isbn13}
                          />
                        ) : null}
                        {format.dimensions ? (
                          <MetadataItem
                            label={t("publications.dimensions")}
                            value={
                              <span>
                                {formatPublicationDimensions(
                                  format.dimensions,
                                  language,
                                )}
                                <span className="mt-1 block text-xs font-normal text-muted">
                                  {t("publications.dimensionsOrder")}
                                </span>
                              </span>
                            }
                          />
                        ) : null}
                      </dl>
                    </div>

                    <div className="flex flex-wrap gap-3 lg:max-w-64 lg:justify-end">
                      {purchaseLinks.length > 0 ? (
                        purchaseLinks.map((link) => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${t("publications.buy")} ${bindingLabel}${link.retailer ? ` — ${link.retailer}` : ""}`}
                            className={buttonClassName({
                              className: "inline-flex items-center gap-2",
                              size: "md",
                              variant: "primary",
                            })}
                          >
                            <span>
                              {t("publications.buy")} {bindingLabel}
                              {link.retailer ? (
                                <span className="block text-[11px] font-medium opacity-75">
                                  {link.retailer}
                                </span>
                              ) : null}
                            </span>
                            <ArrowUpRight
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </a>
                        ))
                      ) : (
                        <p className="max-w-sm text-sm leading-6 text-muted">
                          {t("publications.noExternalLink")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfacePanel>
        ))}
      </div>
    </section>
  );
}

export function PublicationContributorsPanel({
  language,
  publication,
  t,
}: PublicationMetadataProps) {
  if (!publication.contributors?.length) {
    return null;
  }

  return (
    <section className="space-y-5">
      <SectionHeading
        title={t("publications.contributors")}
        description={t("publications.contributorsDesc")}
      />
      <SurfacePanel rounded="lg" shadow="soft" className="p-6 md:p-7">
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {publication.contributors.map((contributor, index) => {
            const description = getLocalizedPublicationText(
              contributor.description,
              language,
              publication.lang,
            );

            return (
              <MetadataItem
                key={`${contributor.role}-${contributor.name}-${index}`}
                label={t(CONTRIBUTOR_ROLE_KEYS[contributor.role])}
                value={
                  <span>
                    {contributor.name}
                    {description ? (
                      <span className="mt-1 block text-sm font-normal text-muted">
                        {description}
                      </span>
                    ) : null}
                  </span>
                }
              />
            );
          })}
        </dl>
      </SurfacePanel>
    </section>
  );
}

export function PublicationCatalogRecords({
  language,
  publication,
  t,
}: PublicationMetadataProps) {
  if (!publication.catalogRecords?.length) {
    return null;
  }

  return (
    <section className="space-y-5">
      <SectionHeading
        title={t("publications.catalogRecords")}
        description={t("publications.catalogRecordsDesc")}
      />
      <SurfacePanel rounded="lg" shadow="soft" className="divide-y divide-line">
        {publication.catalogRecords.map((record) => (
          <article
            key={record.url}
            className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="min-w-0">
              <h3 className="font-bold text-ink">{record.authority}</h3>
              {record.label ? (
                <p className="mt-1 text-sm text-muted">
                  {getLocalizedPublicationText(
                    record.label,
                    language,
                    publication.lang,
                  )}
                </p>
              ) : null}
              {record.identifier ? (
                <p className="mt-2 break-all font-mono text-xs text-muted">
                  {record.identifier}
                </p>
              ) : null}
            </div>
            <a
              href={record.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName({
                className: "shrink-0",
                size: "md",
                variant: "secondary",
              })}
            >
              {t("publications.viewCatalogRecord")}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </article>
        ))}
      </SurfacePanel>
    </section>
  );
}

export function PublicationRightsDisclosure({
  language,
  publication,
  t,
}: PublicationMetadataProps) {
  if (!publication.rights) {
    return null;
  }

  const notice = getLocalizedPublicationText(
    publication.rights.notice,
    language,
    publication.lang,
  );
  const contact = publication.rights.permissionsContact;
  let contactUrl: string | null = null;

  if (contact?.url) {
    contactUrl = contact.url.startsWith("/")
      ? getLocalizedPath(language, contact.url)
      : contact.url;
  }

  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-bold tracking-tight text-ink">
        {t("publications.rights")}
      </h2>
      <SurfacePanel
        as="details"
        rounded="lg"
        shadow="soft"
        className="group overflow-hidden"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-5 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30 [&::-webkit-details-marker]:hidden sm:p-6">
          <span>
            <span className="block font-bold text-ink">
              © {publication.rights.copyrightYear} {publication.rights.holder}
            </span>
            <span className="mt-1 block text-sm text-muted">
              {t("publications.fullRights")}
            </span>
          </span>
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="border-t border-line p-5 sm:p-6">
          {notice ? (
            <p className="max-w-4xl whitespace-pre-line text-sm leading-7 text-muted">
              {notice}
            </p>
          ) : null}

          {contact?.email || contactUrl ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                {t("publications.permissions")}
              </span>
              {contact?.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className={buttonClassName({
                    className: "inline-flex items-center gap-2",
                    size: "sm",
                    variant: "secondary",
                  })}
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {contact.email}
                </a>
              ) : null}
              {contactUrl ? (
                <a
                  href={contactUrl}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                  })}
                >
                  {t("publications.contactPublisher")}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </SurfacePanel>
    </section>
  );
}
