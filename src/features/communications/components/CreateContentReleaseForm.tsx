"use client";

import { ChevronDown } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { createContentReleaseDraft } from "@/actions/admin";
import type { ContentReleaseDraftState } from "@/actions/admin/states";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { elevatedPanelClassName } from "@/components/ElevatedPanel";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { AdminErrorDisclosure } from "@/features/admin/components/AdminErrorDisclosure";
import {
  CONTENT_RELEASE_AUDIENCE_SEGMENTS,
  CONTENT_RELEASE_LOCALE_MODES,
  formatContentReleaseAudienceSegment,
  formatContentReleaseLocaleMode,
  type ContentReleaseCandidate,
} from "@/features/communications/lib/releases";

const createContentReleaseFormCopy = {
  en: {
    audienceSegment: "Audience segment",
    bodyEn: "English message",
    bodyEnPlaceholder:
      "Share what is new, why it matters, and where the reader should go next.",
    bodyNl: "Dutch message",
    bodyNlPlaceholder:
      "Vat samen wat er nieuw is, waarom het relevant is en waar de lezer verder kan gaan.",
    collapse: "Collapse",
    compose: "Compose",
    create: "Create release draft",
    description:
      "Pick published lessons and publications, write the EN/NL copy, and save a release snapshot without keeping the full composer open all the time.",
    draftSaved: "Draft saved",
    draftsNotice:
      "Drafts snapshot the selected titles and URLs so later content edits do not silently change the outgoing release.",
    lessons: "Lessons",
    localeMode: "Locale mode",
    noLessons: "No published grammar lessons are available yet.",
    noPublications: "No published publications are available yet.",
    publications: "Publications",
    publishedLessons: "Published lessons",
    publishedPublications: "Published publications",
    saving: "Saving draft...",
    title: "Draft composer",
    subjectEn: "English subject",
    subjectEnPlaceholder: "New Coptic lesson available",
    subjectNl: "Dutch subject",
    subjectNlPlaceholder: "Nieuwe Koptische les beschikbaar",
  },
  nl: {
    audienceSegment: "Publiekssegment",
    bodyEn: "Engelse tekst",
    bodyEnPlaceholder:
      "Share what is new, why it matters, and where the reader should go next.",
    bodyNl: "Nederlandse tekst",
    bodyNlPlaceholder:
      "Vat samen wat er nieuw is, waarom het relevant is en waar de lezer verder kan gaan.",
    collapse: "Inklappen",
    compose: "Opstellen",
    create: "Releaseconcept maken",
    description:
      "Kies gepubliceerde lessen en publicaties, schrijf de EN/NL-tekst en sla een releasesnapshot op zonder de volledige composer steeds open te houden.",
    draftSaved: "Concept opgeslagen",
    draftsNotice:
      "Concepten leggen de geselecteerde titels en URL's vast, zodat latere inhoudswijzigingen de uitgaande release niet stilzwijgend aanpassen.",
    lessons: "Lessen",
    localeMode: "Taalmodus",
    noLessons: "Er zijn nog geen gepubliceerde grammaticalessen beschikbaar.",
    noPublications: "Er zijn nog geen gepubliceerde publicaties beschikbaar.",
    publications: "Publicaties",
    publishedLessons: "Gepubliceerde lessen",
    publishedPublications: "Gepubliceerde publicaties",
    saving: "Concept wordt opgeslagen...",
    title: "Conceptcomposer",
    subjectEn: "Engels onderwerp",
    subjectEnPlaceholder: "New Coptic lesson available",
    subjectNl: "Nederlands onderwerp",
    subjectNlPlaceholder: "Nieuwe Koptische les beschikbaar",
  },
} as const;

export function CreateContentReleaseForm({
  publicationCandidates,
  lessonCandidates,
}: {
  publicationCandidates: ContentReleaseCandidate[];
  lessonCandidates: ContentReleaseCandidate[];
}) {
  const { language } = useLanguage();
  const copy = createContentReleaseFormCopy[language];
  const totalCandidates =
    lessonCandidates.length + publicationCandidates.length;
  const [state, formAction, isPending] = useActionState<
    ContentReleaseDraftState | null,
    FormData
  >(createContentReleaseDraft, null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.error) {
      detailsRef.current?.setAttribute("open", "");
    }

    if (state?.success) {
      formRef.current?.reset();
      detailsRef.current?.removeAttribute("open");
    }
  }, [state]);

  return (
    <details
      ref={detailsRef}
      className={surfacePanelClassName({
        shadow: "soft",
        className: "group overflow-hidden",
      })}
      open={totalCandidates === 0}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden md:p-7">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="coptic" size="xs">
              {copy.title}
            </Badge>
            <Badge tone="surface" size="xs">
              {copy.lessons}:{" "}
              {lessonCandidates.length.toLocaleString(
                language === "nl" ? "nl-BE" : "en-US",
              )}
            </Badge>
            <Badge tone="surface" size="xs">
              {copy.publications}:{" "}
              {publicationCandidates.length.toLocaleString(
                language === "nl" ? "nl-BE" : "en-US",
              )}
            </Badge>
            {state?.success ? (
              <Badge tone="coptic" size="xs">
                {copy.draftSaved}
              </Badge>
            ) : null}
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            {copy.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-sm font-medium text-muted">
          <span className="group-open:hidden">{copy.compose}</span>
          <span className="hidden group-open:inline">{copy.collapse}</span>
          <ChevronDown className="mt-1 h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
        </div>
      </summary>

      <form
        ref={formRef}
        action={formAction}
        className="space-y-6 border-t border-line p-6 md:p-7"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FormField htmlFor="audience_segment" label={copy.audienceSegment}>
            <select
              id="audience_segment"
              name="audience_segment"
              defaultValue="lessons"
              className="select-base"
            >
              {CONTENT_RELEASE_AUDIENCE_SEGMENTS.map((segment) => (
                <option key={segment} value={segment}>
                  {formatContentReleaseAudienceSegment(segment, language)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField htmlFor="locale_mode" label={copy.localeMode}>
            <select
              id="locale_mode"
              name="locale_mode"
              defaultValue="localized"
              className="select-base"
            >
              {CONTENT_RELEASE_LOCALE_MODES.map((localeMode) => (
                <option key={localeMode} value={localeMode}>
                  {formatContentReleaseLocaleMode(localeMode, language)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField htmlFor="subject_en" label={copy.subjectEn}>
            <input
              id="subject_en"
              name="subject_en"
              type="text"
              className="input-base"
              maxLength={160}
              placeholder={copy.subjectEnPlaceholder}
            />
          </FormField>

          <FormField htmlFor="subject_nl" label={copy.subjectNl}>
            <input
              id="subject_nl"
              name="subject_nl"
              type="text"
              className="input-base"
              maxLength={160}
              placeholder={copy.subjectNlPlaceholder}
            />
          </FormField>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField htmlFor="body_en" label={copy.bodyEn}>
            <textarea
              id="body_en"
              name="body_en"
              rows={6}
              className="textarea-base resize-y"
              placeholder={copy.bodyEnPlaceholder}
            />
          </FormField>

          <FormField htmlFor="body_nl" label={copy.bodyNl}>
            <textarea
              id="body_nl"
              name="body_nl"
              rows={6}
              className="textarea-base resize-y"
              placeholder={copy.bodyNlPlaceholder}
            />
          </FormField>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <FormField
            label={`${copy.publishedLessons} (${lessonCandidates.length.toLocaleString(
              language === "nl" ? "nl-BE" : "en-US",
            )})`}
            className={elevatedPanelClassName({ className: "p-4" })}
          >
            <div className="space-y-3">
              {lessonCandidates.length === 0 ? (
                <p className="text-sm text-muted">{copy.noLessons}</p>
              ) : (
                lessonCandidates.map((candidate) => (
                  <label
                    key={candidate.id}
                    className="flex items-start gap-3 text-sm leading-6 text-muted"
                  >
                    <input
                      type="checkbox"
                      name="release_item"
                      value={candidate.id}
                      className="mt-1 h-4 w-4 rounded border-line text-accent-strong focus:ring-accent/30"
                    />
                    <span>
                      <span className="block font-semibold text-ink">
                        {candidate.title}
                      </span>
                      {(() => {
                        const summary =
                          language === "nl" && candidate.summaryNl
                            ? candidate.summaryNl
                            : candidate.summaryEn;

                        return summary ? (
                          <span className="block text-xs text-muted">
                            {summary}
                          </span>
                        ) : null;
                      })()}
                    </span>
                  </label>
                ))
              )}
            </div>
          </FormField>

          <FormField
            label={`${copy.publishedPublications} (${publicationCandidates.length.toLocaleString(
              language === "nl" ? "nl-BE" : "en-US",
            )})`}
            className={elevatedPanelClassName({ className: "p-4" })}
          >
            <div className="space-y-3">
              {publicationCandidates.length === 0 ? (
                <p className="text-sm text-muted">{copy.noPublications}</p>
              ) : (
                publicationCandidates.map((candidate) => (
                  <label
                    key={candidate.id}
                    className="flex items-start gap-3 text-sm leading-6 text-muted"
                  >
                    <input
                      type="checkbox"
                      name="release_item"
                      value={candidate.id}
                      className="mt-1 h-4 w-4 rounded border-line text-accent-strong focus:ring-accent/30"
                    />
                    <span>
                      <span className="block font-semibold text-ink">
                        {candidate.title}
                      </span>
                      {(() => {
                        const summary =
                          language === "nl" && candidate.summaryNl
                            ? candidate.summaryNl
                            : candidate.summaryEn;

                        return summary ? (
                          <span className="block text-xs text-muted">
                            {summary}
                          </span>
                        ) : null;
                      })()}
                    </span>
                  </label>
                ))
              )}
            </div>
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? copy.saving : copy.create}
          </Button>
          <p className="text-sm text-muted">{copy.draftsNotice}</p>
        </div>

        {state?.error ? (
          <AdminErrorDisclosure language={language} message={state.error} />
        ) : null}
      </form>
    </details>
  );
}
