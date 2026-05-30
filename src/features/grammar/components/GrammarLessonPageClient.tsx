"use client";

import { ArrowLeft, Layers3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";

import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { Button, buttonClassName } from "@/components/Button";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import type {
  GrammarLessonBundle,
  GrammarSectionDocument,
} from "@/content/grammar/schema";
import {
  type GrammarAdjacentLessonLink,
  GrammarLessonBottomNavigation,
  GrammarLessonLearnerPanel,
  GrammarLessonNavigationPanel,
  GrammarLessonNotesPanel,
  GrammarLessonSectionProgressButton,
} from "@/features/grammar/components/GrammarLessonLearnerPanel";
import { GrammarLessonRenderProvider } from "@/features/grammar/components/GrammarLessonRenderContext";
import { GrammarLessonConceptSummary } from "@/features/grammar/components/GrammarLessonSemantics";
import {
  GrammarLessonReadingWorkspace,
  GrammarLessonStudyWorkspace,
} from "@/features/grammar/components/GrammarLessonWorkspace";
import { getGrammarLessonAbbreviationSectionId } from "@/features/grammar/lib/grammarPresentation";
import {
  useActiveLessonSectionId,
  usePersistentLessonRailState,
  usePersistentLessonWorkspaceMode,
} from "@/features/grammar/lib/lessonWorkspaceState";
import { useGrammarLessonLearnerState } from "@/features/grammar/lib/useGrammarLessonLearnerState";
import { GrammarLessonDocumentRenderer } from "@/features/grammar/renderers/GrammarLessonDocumentRenderer";
import { DEFAULT_GRAMMAR_PRACTICE_DECK_ID } from "@/features/practice/lib/practiceDeckDefaults";
import { cx } from "@/lib/classes";
import {
  getPracticePath,
  getGrammarPath,
  getLocalizedHomePath,
} from "@/lib/locale";

type GrammarLessonPageClientProps = {
  lessonBundle: GrammarLessonBundle;
  nextLesson: GrammarAdjacentLessonLink | null;
  previousLesson: GrammarAdjacentLessonLink | null;
};

function getOrderedSections(
  lessonBundle: GrammarLessonBundle,
): GrammarSectionDocument[] {
  const sectionsById = new Map(
    lessonBundle.lesson.sections.map(
      (section) => [section.id, section] as const,
    ),
  );

  return lessonBundle.lesson.sectionOrder
    .map((sectionId) => sectionsById.get(sectionId))
    .filter(
      (section): section is GrammarSectionDocument => section !== undefined,
    );
}

export function GrammarLessonPageClient({
  lessonBundle,
  nextLesson,
  previousLesson,
}: GrammarLessonPageClientProps) {
  const { language, t } = useLanguage();
  const [renderMode, setRenderMode] = useState<"web" | "pdf">("web");
  const lesson = lessonBundle.lesson;
  const orderedSections = getOrderedSections(lessonBundle);
  const lessonContentId = `${lesson.id}-pdf-content`;
  const lessonPracticeHref =
    lesson.slug === "lesson-1"
      ? getPracticePath(language, DEFAULT_GRAMMAR_PRACTICE_DECK_ID)
      : null;
  const lessonOutlineEyebrow =
    language === "en" ? "Lesson map" : "Lesoverzicht";
  const lessonOutlineTitle =
    language === "en" ? "On this page" : "Op deze pagina";
  const lessonToolsTitle = language === "en" ? "Lesson tools" : "Leshulp";
  const lessonAbbreviationAppendixTitle =
    language === "en"
      ? "Abbreviations and symbols used in this lesson"
      : "Afkortingen en symbolen in deze les";
  const lessonRenderSessionKey = `${lesson.id}:${language}:${renderMode}`;
  const lessonDescription =
    lesson.description?.[language] ?? lesson.summary[language];
  const learnerState = useGrammarLessonLearnerState(lessonBundle);
  const hasSemanticSidebar =
    (renderMode === "web" && learnerState.status !== "unavailable") ||
    lessonBundle.concepts.length > 0;
  const lessonOutlineSections = useMemo(
    () => [
      ...orderedSections.map((section) => ({
        id: section.id,
        title: section.title[language],
      })),
      {
        id: getGrammarLessonAbbreviationSectionId(lesson.id),
        title: lessonAbbreviationAppendixTitle,
      },
    ],
    [language, lesson.id, lessonAbbreviationAppendixTitle, orderedSections],
  );
  const lessonOutlineSectionIds = useMemo(
    () => lessonOutlineSections.map((section) => section.id),
    [lessonOutlineSections],
  );
  const [canUseStudyMode, setCanUseStudyMode] = useState(false);
  const [workspaceMode, setWorkspaceMode] = usePersistentLessonWorkspaceMode(
    lesson.id,
  );
  const isInteractiveLessonView = renderMode === "web";
  const isStudyMode =
    isInteractiveLessonView && hasSemanticSidebar && workspaceMode === "study";
  const isStudyLayoutActive = isStudyMode && canUseStudyMode;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 96rem)");
    const syncMediaQuery = () => {
      setCanUseStudyMode(mediaQuery.matches);
    };

    syncMediaQuery();
    mediaQuery.addEventListener("change", syncMediaQuery);

    return () => {
      mediaQuery.removeEventListener("change", syncMediaQuery);
    };
  }, []);

  const activeSectionId = useActiveLessonSectionId(lessonOutlineSectionIds);
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] =
    usePersistentLessonRailState(lesson.id, "left", false);
  const [isRightRailCollapsed, setIsRightRailCollapsed] =
    usePersistentLessonRailState(lesson.id, "right", false);
  const leftRailCollapsed = isStudyLayoutActive && isLeftRailCollapsed;
  const rightRailCollapsed = isStudyLayoutActive && isRightRailCollapsed;
  const leftRailLabels =
    language === "en"
      ? {
          expand: "Expand lesson map",
          collapse: "Collapse lesson map",
          compact: "Map",
        }
      : {
          expand: "Lesoverzicht uitklappen",
          collapse: "Lesoverzicht inklappen",
          compact: "Les",
        };
  const rightRailLabels =
    language === "en"
      ? {
          expand: "Expand study tools",
          collapse: "Collapse study tools",
          compact: "Study",
        }
      : {
          expand: "Studiehulp uitklappen",
          collapse: "Studiehulp inklappen",
          compact: "Studie",
        };
  const studyModeLabels =
    language === "en"
      ? {
          enter: "Study mode",
          exit: "Reading layout",
        }
      : {
          enter: "Studiemodus",
          exit: "Leesweergave",
        };
  const lessonDocument = (
    <GrammarLessonDocumentRenderer
      lessonBundle={lessonBundle}
      language={language}
      renderSectionFooter={
        learnerState.sectionCompletionEnabled
          ? (section) => (
              <div className="flex justify-end">
                <GrammarLessonSectionProgressButton
                  isCompleted={learnerState.completedSectionIds.includes(
                    section.id,
                  )}
                  isPending={learnerState.pendingSectionId === section.id}
                  language={language}
                  onToggle={() => learnerState.toggleSectionComplete(section)}
                />
              </div>
            )
          : undefined
      }
    />
  );
  const lessonNotes =
    renderMode === "web" ? (
      <GrammarLessonNotesPanel
        errorMessage={learnerState.errorMessage}
        hasUnsavedNoteChanges={learnerState.hasUnsavedNoteChanges}
        isNotePending={learnerState.isNotePending}
        language={language}
        noteText={learnerState.noteText}
        noteUpdatedAt={learnerState.noteUpdatedAt}
        onSaveNote={learnerState.saveNote}
        onNoteChange={learnerState.setNoteText}
        status={learnerState.status}
      />
    ) : null;
  const lessonBottomNavigation =
    renderMode === "web" ? (
      <GrammarLessonBottomNavigation
        language={language}
        nextLesson={nextLesson}
        previousLesson={previousLesson}
      />
    ) : null;
  const learnerPanel =
    renderMode === "web" ? (
      <GrammarLessonLearnerPanel
        errorMessage={learnerState.errorMessage}
        isBookmarkPending={learnerState.isBookmarkPending}
        language={language}
        onToggleBookmark={learnerState.toggleBookmark}
        status={learnerState.status}
        summary={learnerState.summary}
      />
    ) : null;
  const navigationPanel =
    renderMode === "web" ? (
      <GrammarLessonNavigationPanel
        language={language}
        nextLesson={nextLesson}
        previousLesson={previousLesson}
      />
    ) : null;
  const conceptSummary = (
    <GrammarLessonConceptSummary
      lessonBundle={lessonBundle}
      language={language}
    />
  );

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content space-y-0"
      width="standard"
      accents={[
        pageShellAccents.heroCopticBand,
        pageShellAccents.topRightGoldWashInset,
        pageShellAccents.bottomLeftCopticWashSoft,
      ]}
    >
      <div className="mb-8 space-y-4">
        <BreadcrumbTrail
          items={[
            { label: t("nav.home"), href: getLocalizedHomePath(language) },
            { label: t("nav.grammar"), href: getGrammarPath(language) },
            { label: lesson.title[language] },
          ]}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={getGrammarPath(language)}
            className={buttonClassName({
              className: "gap-2 px-4",
              variant: "secondary",
            })}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("grammar.back")}
          </Link>
          <div
            className={cx(
              "grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end",
              lessonPracticeHref ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {isInteractiveLessonView &&
            hasSemanticSidebar &&
            canUseStudyMode ? (
              <Button
                type="button"
                variant={isStudyMode ? "primary" : "secondary"}
                className="hidden 2xl:inline-flex"
                onClick={() =>
                  setWorkspaceMode(isStudyMode ? "reading" : "study")
                }
              >
                {isStudyMode ? studyModeLabels.exit : studyModeLabels.enter}
              </Button>
            ) : null}
            {lessonPracticeHref ? (
              <Link
                href={lessonPracticeHref}
                className={buttonClassName({
                  className: "w-full min-w-0 gap-2 px-3 sm:w-auto sm:px-4",
                  variant: "secondary",
                })}
              >
                <Layers3 className="h-4 w-4" />
                {t("grammar.practiceLesson")}
              </Link>
            ) : null}
            <DownloadPdfButton
              targetId={lessonContentId}
              fileName={`Coptic_${lesson.title.en.replace(/\s+/g, "_")}.pdf`}
              className="w-full min-w-0 px-3 sm:w-auto sm:px-4"
              wrapperClassName="w-full min-w-0 sm:w-auto"
              beforeCapture={() => {
                flushSync(() => {
                  setRenderMode("pdf");
                });
              }}
              afterCapture={() => {
                flushSync(() => {
                  setRenderMode("web");
                });
              }}
            />
          </div>
        </div>
      </div>

      <div id={lesson.id} className="bg-transparent pb-4 dark:bg-transparent">
        <GrammarLessonRenderProvider
          renderMode={renderMode}
          sessionKey={lessonRenderSessionKey}
        >
          <div id={lessonContentId}>
            <PageHeader
              title={`${t("nav.grammar")} - ${lesson.title[language]}`}
              description={lessonDescription}
              tone="coptic"
              size="workspace"
              className="mb-6 md:mb-10"
            />

            {isStudyLayoutActive ? (
              <GrammarLessonStudyWorkspace
                activeSectionId={activeSectionId}
                conceptSummary={conceptSummary}
                hasSemanticSidebar={hasSemanticSidebar}
                isLeftRailCollapsed={leftRailCollapsed}
                isRightRailCollapsed={rightRailCollapsed}
                learnerPanel={learnerPanel}
                leftRailLabels={leftRailLabels}
                lessonBottomNavigation={lessonBottomNavigation}
                lessonDocument={lessonDocument}
                lessonNotes={lessonNotes}
                lessonOutlineEyebrow={lessonOutlineEyebrow}
                lessonOutlineSections={lessonOutlineSections}
                lessonOutlineTitle={lessonOutlineTitle}
                navigationPanel={navigationPanel}
                onLeftRailToggle={() =>
                  setIsLeftRailCollapsed(!leftRailCollapsed)
                }
                onRightRailToggle={() =>
                  setIsRightRailCollapsed(!rightRailCollapsed)
                }
                rightRailLabels={rightRailLabels}
              />
            ) : null}

            <div className={cx(isStudyLayoutActive && "2xl:hidden")}>
              <GrammarLessonReadingWorkspace
                activeSectionId={activeSectionId}
                conceptSummary={conceptSummary}
                hasSemanticSidebar={hasSemanticSidebar}
                learnerPanel={learnerPanel}
                lessonBottomNavigation={lessonBottomNavigation}
                lessonDocument={lessonDocument}
                lessonNotes={lessonNotes}
                lessonOutlineEyebrow={lessonOutlineEyebrow}
                lessonOutlineSections={lessonOutlineSections}
                lessonOutlineTitle={lessonOutlineTitle}
                lessonToolsTitle={lessonToolsTitle}
              />
            </div>
          </div>
        </GrammarLessonRenderProvider>
      </div>
    </PageShell>
  );
}
