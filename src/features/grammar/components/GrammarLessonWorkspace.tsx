"use client";

import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

import { Button, controlButtonClassName } from "@/components/Button";
import { SurfacePanel } from "@/components/SurfacePanel";
import { GrammarLessonOutline } from "@/features/grammar/components/GrammarLessonPrimitives";
import { cx } from "@/lib/classes";

import type { ReactNode } from "react";

type LessonRailSide = "left" | "right";

type RailLabels = {
  collapse: string;
  compact: string;
  expand: string;
};

type StudyWorkspaceProps = {
  activeSectionId: string | null;
  conceptSummary: ReactNode;
  hasSemanticSidebar: boolean;
  isLeftRailCollapsed: boolean;
  isRightRailCollapsed: boolean;
  learnerPanel: ReactNode;
  leftRailLabels: RailLabels;
  lessonBottomNavigation: ReactNode;
  lessonDocument: ReactNode;
  lessonNotes: ReactNode;
  lessonOutlineEyebrow: string;
  lessonOutlineSections: Array<{
    id: string;
    title: string;
  }>;
  lessonOutlineTitle: string;
  navigationPanel: ReactNode;
  onLeftRailToggle: () => void;
  onRightRailToggle: () => void;
  rightRailLabels: RailLabels;
};

type ReadingWorkspaceProps = {
  activeSectionId: string | null;
  conceptSummary: ReactNode;
  hasSemanticSidebar: boolean;
  learnerPanel: ReactNode;
  lessonBottomNavigation: ReactNode;
  lessonDocument: ReactNode;
  lessonNotes: ReactNode;
  lessonOutlineEyebrow: string;
  lessonOutlineSections: Array<{
    id: string;
    title: string;
  }>;
  lessonOutlineTitle: string;
  lessonToolsTitle: string;
};

function getStudyWorkspaceGridClass({
  hasSemanticSidebar,
  isLeftRailCollapsed,
  isRightRailCollapsed,
}: {
  hasSemanticSidebar: boolean;
  isLeftRailCollapsed: boolean;
  isRightRailCollapsed: boolean;
}) {
  if (!hasSemanticSidebar) {
    return isLeftRailCollapsed
      ? "2xl:grid-cols-[3.75rem_minmax(0,1fr)]"
      : "2xl:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)]";
  }

  if (isLeftRailCollapsed && isRightRailCollapsed) {
    return "2xl:grid-cols-[3.75rem_minmax(0,1fr)_3.75rem]";
  }

  if (isLeftRailCollapsed) {
    return "2xl:grid-cols-[3.75rem_minmax(0,1fr)_minmax(18rem,20rem)]";
  }

  if (isRightRailCollapsed) {
    return "2xl:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)_3.75rem]";
  }

  return "2xl:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)_minmax(18rem,20rem)]";
}

function DesktopRailToggle({
  collapsed,
  collapseLabel,
  expandLabel,
  onToggle,
  side,
}: {
  collapsed: boolean;
  collapseLabel: string;
  expandLabel: string;
  onToggle: () => void;
  side: LessonRailSide;
}) {
  let Icon = side === "left" ? PanelLeftClose : PanelRightClose;

  if (collapsed) {
    Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onToggle}
      aria-label={collapsed ? expandLabel : collapseLabel}
      className="h-9 w-9 px-0"
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{collapsed ? expandLabel : collapseLabel}</span>
    </Button>
  );
}

function CollapsedRailCard({
  collapsedLabel,
  expandLabel,
  onToggle,
  side,
}: {
  collapsedLabel: string;
  expandLabel: string;
  onToggle: () => void;
  side: LessonRailSide;
}) {
  const Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;

  return (
    <SurfacePanel
      rounded="lg"
      shadow="soft"
      variant="subtle"
      className="w-[3.75rem] p-2"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={expandLabel}
        className={controlButtonClassName({
          className:
            "w-full flex-col border-transparent bg-transparent px-2 py-3 text-center shadow-none hover:bg-elevated",
        })}
      >
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
          {collapsedLabel}
        </span>
      </button>
    </SurfacePanel>
  );
}

function MobileLessonTools({
  activeSectionId,
  conceptSummary,
  hasSemanticSidebar,
  learnerPanel,
  lessonOutlineEyebrow,
  lessonOutlineSections,
  lessonOutlineTitle,
  lessonToolsTitle,
}: ReadingWorkspaceProps) {
  return (
    <details className="group mb-6 overflow-hidden rounded-lg border border-line bg-surface/88 shadow-soft backdrop-blur-sm xl:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {lessonOutlineEyebrow}
          </p>
          <h2 className="text-base font-semibold text-ink">
            {lessonToolsTitle}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-[0.12em] text-muted">
            {String(lessonOutlineSections.length).padStart(2, "0")}
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
        </div>
      </summary>

      <div className="space-y-4 border-t border-line p-4">
        <GrammarLessonOutline
          activeSectionId={activeSectionId}
          eyebrow={lessonOutlineEyebrow}
          title={lessonOutlineTitle}
          sections={lessonOutlineSections}
        />

        {hasSemanticSidebar ? (
          <div className="space-y-4">
            {learnerPanel}
            {conceptSummary}
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function GrammarLessonStudyWorkspace({
  activeSectionId,
  conceptSummary,
  hasSemanticSidebar,
  isLeftRailCollapsed,
  isRightRailCollapsed,
  learnerPanel,
  leftRailLabels,
  lessonBottomNavigation,
  lessonDocument,
  lessonNotes,
  lessonOutlineEyebrow,
  lessonOutlineSections,
  lessonOutlineTitle,
  navigationPanel,
  onLeftRailToggle,
  onRightRailToggle,
  rightRailLabels,
}: StudyWorkspaceProps) {
  const studyGridClassName = getStudyWorkspaceGridClass({
    hasSemanticSidebar,
    isLeftRailCollapsed,
    isRightRailCollapsed,
  });

  return (
    <div className="relative hidden 2xl:block">
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-6 3xl:px-8">
        <div className={cx("grid items-start gap-6", studyGridClassName)}>
          <div className="app-sticky-panel self-start">
            <div className="flex flex-col gap-2">
              {isLeftRailCollapsed ? (
                <CollapsedRailCard
                  collapsedLabel={leftRailLabels.compact}
                  expandLabel={leftRailLabels.expand}
                  onToggle={onLeftRailToggle}
                  side="left"
                />
              ) : (
                <>
                  <div className="flex justify-end">
                    <DesktopRailToggle
                      collapsed={false}
                      expandLabel={leftRailLabels.expand}
                      collapseLabel={leftRailLabels.collapse}
                      onToggle={onLeftRailToggle}
                      side="left"
                    />
                  </div>
                  <div className="max-h-[calc(100vh-var(--app-sticky-offset)-4rem)] overflow-y-auto pr-1">
                    <GrammarLessonOutline
                      activeSectionId={activeSectionId}
                      eyebrow={lessonOutlineEyebrow}
                      title={lessonOutlineTitle}
                      sections={lessonOutlineSections}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <SurfacePanel
            rounded="lg"
            variant="elevated"
            className="px-6 py-6 sm:px-8 md:px-10"
          >
            <div className="mx-auto w-full max-w-4xl space-y-6">
              {lessonDocument}
              {lessonBottomNavigation}
              {lessonNotes}
            </div>
          </SurfacePanel>

          {hasSemanticSidebar ? (
            <div className="app-sticky-panel self-start">
              <div className="flex flex-col gap-2">
                {isRightRailCollapsed ? (
                  <CollapsedRailCard
                    collapsedLabel={rightRailLabels.compact}
                    expandLabel={rightRailLabels.expand}
                    onToggle={onRightRailToggle}
                    side="right"
                  />
                ) : (
                  <>
                    <div className="flex justify-end">
                      <DesktopRailToggle
                        collapsed={false}
                        expandLabel={rightRailLabels.expand}
                        collapseLabel={rightRailLabels.collapse}
                        onToggle={onRightRailToggle}
                        side="right"
                      />
                    </div>
                    <div className="max-h-[calc(100vh-var(--app-sticky-offset)-4rem)] space-y-4 overflow-y-auto pr-1">
                      {learnerPanel}
                      {navigationPanel}
                      {conceptSummary}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function GrammarLessonReadingWorkspace({
  activeSectionId,
  conceptSummary,
  hasSemanticSidebar,
  learnerPanel,
  lessonBottomNavigation,
  lessonDocument,
  lessonNotes,
  lessonOutlineEyebrow,
  lessonOutlineSections,
  lessonOutlineTitle,
  lessonToolsTitle,
}: ReadingWorkspaceProps) {
  return (
    <div>
      <SurfacePanel
        rounded="lg"
        variant="elevated"
        className="p-4 transition-colors duration-300 sm:p-5 md:p-10"
      >
        {hasSemanticSidebar ? (
          <>
            <MobileLessonTools
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
            <div className="mb-8 hidden gap-6 xl:grid xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)]">
              <GrammarLessonOutline
                activeSectionId={activeSectionId}
                eyebrow={lessonOutlineEyebrow}
                title={lessonOutlineTitle}
                sections={lessonOutlineSections}
              />
              <div className="space-y-4">
                {learnerPanel}
                {conceptSummary}
              </div>
            </div>
          </>
        ) : (
          <>
            <MobileLessonTools
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
            <GrammarLessonOutline
              activeSectionId={activeSectionId}
              className="mb-8 hidden xl:block"
              eyebrow={lessonOutlineEyebrow}
              title={lessonOutlineTitle}
              sections={lessonOutlineSections}
            />
          </>
        )}

        {lessonDocument}
        {lessonBottomNavigation}
      </SurfacePanel>

      {lessonNotes ? <div className="mt-6">{lessonNotes}</div> : null}
    </div>
  );
}
