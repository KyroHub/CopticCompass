"use client";

import type {
  GrammarBlock,
  GrammarLessonBundle,
} from "@/content/grammar/schema";
import { Footnote } from "@/features/grammar/components/Footnote";
import { GrammarLessonCard } from "@/features/grammar/components/GrammarLessonPrimitives";
import { useGrammarLessonRenderContext } from "@/features/grammar/components/GrammarLessonRenderContext";
import { cx } from "@/lib/classes";
import type { Language } from "@/types/i18n";

import {
  GrammarExampleGroupBlock,
  GrammarExerciseGroupBlock,
} from "./GrammarBlockGroupRenderers";
import { GrammarTableBlockRenderer } from "./GrammarBlockTableRenderer";
import { GrammarInlineRenderer } from "./GrammarInlineRenderer";

import type { RenderGrammarBlocks } from "./grammarBlockRendererShared";

type GrammarBlockRendererProps = {
  blocks: readonly GrammarBlock[];
  language: Language;
  lessonBundle?: GrammarLessonBundle;
  className?: string;
  currentSectionId?: string;
  inheritTextColor?: boolean;
};

/**
 * Renders one inline footnote reference either as a live endnote trigger or as
 * a plain fallback marker when the lesson bundle is incomplete.
 */
function renderFootnoteRef(
  ref: string,
  key: string,
  language: Language,
  lessonBundle: GrammarLessonBundle | undefined,
  inheritTextColor: boolean,
  renderBlocks: RenderGrammarBlocks,
) {
  const footnote = lessonBundle?.footnotes.find((item) => item.id === ref);

  if (!footnote || !lessonBundle) {
    return (
      <sup key={key} className="text-xs font-semibold text-coptic">
        [{ref}]
      </sup>
    );
  }

  const number =
    lessonBundle.footnotes.findIndex((item) => item.id === ref) + 1;

  return (
    <Footnote
      key={key}
      number={number}
      content={renderBlocks(footnote.content[language], {
        className: "space-y-2",
        inheritTextColor,
      })}
    />
  );
}

/**
 * Renders one structured grammar block into the matching lesson UI component.
 */
function renderBlock(
  block: GrammarBlock,
  index: number,
  language: Language,
  lessonBundle: GrammarLessonBundle | undefined,
  currentSectionId: string | undefined,
  inheritTextColor: boolean,
  renderMode: "web" | "pdf",
  renderBlocks: RenderGrammarBlocks,
) {
  switch (block.type) {
    case "paragraph":
      return (
        <p
          key={`${block.type}-${index}`}
          className={cx(
            "leading-7",
            inheritTextColor ? "text-inherit" : "text-muted",
          )}
        >
          <GrammarInlineRenderer
            nodes={block.content}
            language={language}
            lessonId={lessonBundle?.lesson.id}
            renderFootnoteRef={(ref, key) =>
              renderFootnoteRef(
                ref,
                key,
                language,
                lessonBundle,
                inheritTextColor,
                renderBlocks,
              )
            }
          />
        </p>
      );
    case "heading": {
      const HeadingTag = block.level === 2 ? "h2" : "h3";

      return (
        <HeadingTag
          key={`${block.type}-${block.id}`}
          id={block.id}
          className={cx(
            "font-semibold text-ink",
            block.level === 2 ? "text-2xl" : "text-xl",
          )}
        >
          <GrammarInlineRenderer
            nodes={block.content}
            language={language}
            lessonId={lessonBundle?.lesson.id}
            renderFootnoteRef={(ref, key) =>
              renderFootnoteRef(
                ref,
                key,
                language,
                lessonBundle,
                inheritTextColor,
                renderBlocks,
              )
            }
          />
        </HeadingTag>
      );
    }
    case "list": {
      const ListTag = block.style === "ordered" ? "ol" : "ul";

      return (
        <ListTag
          key={`${block.type}-${index}`}
          className={cx(
            "ml-5 space-y-3",
            block.style === "ordered" ? "list-decimal" : "list-disc",
          )}
        >
          {block.items.map((item) => (
            <li
              key={item.id}
              className={cx(
                "space-y-3",
                inheritTextColor ? "text-inherit" : "text-muted",
              )}
            >
              <GrammarBlockRenderer
                blocks={item.blocks}
                language={language}
                lessonBundle={lessonBundle}
                currentSectionId={currentSectionId}
                inheritTextColor={inheritTextColor}
              />
            </li>
          ))}
        </ListTag>
      );
    }
    case "table":
      return (
        <div key={`${block.type}-${block.id}`}>
          <GrammarTableBlockRenderer
            block={block}
            inheritTextColor={inheritTextColor}
            language={language}
            lessonBundle={lessonBundle}
            renderBlocks={renderBlocks}
            renderMode={renderMode}
          />
        </div>
      );
    case "callout":
      return (
        <GrammarLessonCard
          key={`${block.type}-${index}`}
          tone={block.tone === "info" ? "coptic" : "neutral"}
          className={cx(
            "space-y-3",
            block.tone === "warning" && "border-warning/25 bg-warning/10",
          )}
        >
          {block.title ? (
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted">
              {block.title[language]}
            </h3>
          ) : null}
          <GrammarBlockRenderer
            blocks={block.blocks}
            language={language}
            lessonBundle={lessonBundle}
            currentSectionId={currentSectionId}
            inheritTextColor={inheritTextColor}
          />
        </GrammarLessonCard>
      );
    case "exampleGroup":
      return (
        <div key={`${block.type}-${index}`}>
          <GrammarExampleGroupBlock
            columns={block.columns}
            exampleIds={block.refs}
            currentSectionId={currentSectionId}
            inheritTextColor={inheritTextColor}
            language={language}
            lessonBundle={lessonBundle}
            renderBlocks={renderBlocks}
          />
        </div>
      );
    case "exerciseGroup":
      return (
        <div key={`${block.type}-${index}`}>
          <GrammarExerciseGroupBlock
            exerciseIds={block.refs}
            currentSectionId={currentSectionId}
            inheritTextColor={inheritTextColor}
            language={language}
            lessonBundle={lessonBundle}
            renderBlocks={renderBlocks}
          />
        </div>
      );
    default: {
      const exhaustiveCheck: never = block;
      return exhaustiveCheck;
    }
  }
}

/**
 * Recursively renders the structured lesson block tree for web and PDF
 * presentation modes.
 */
export function GrammarBlockRenderer({
  blocks,
  language,
  lessonBundle,
  className,
  currentSectionId,
  inheritTextColor = false,
}: GrammarBlockRendererProps) {
  const { renderMode } = useGrammarLessonRenderContext();
  const renderNestedBlocks: RenderGrammarBlocks = (nestedBlocks, options) => (
    <GrammarBlockRenderer
      blocks={nestedBlocks}
      language={language}
      lessonBundle={lessonBundle}
      className={options?.className}
      currentSectionId={currentSectionId}
      inheritTextColor={options?.inheritTextColor ?? inheritTextColor}
    />
  );

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={cx("space-y-4", className)}>
      {blocks.map((block, index) =>
        renderBlock(
          block,
          index,
          language,
          lessonBundle,
          currentSectionId,
          inheritTextColor,
          renderMode,
          renderNestedBlocks,
        ),
      )}
    </div>
  );
}
