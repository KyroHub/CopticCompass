"use client";

import { Keyboard, Search, X } from "lucide-react";

import { iconButtonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { SurfacePanel } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";
import { antinoou } from "@/lib/fonts";

import CopticKeyboard from "./CopticKeyboard";

import type { ReactNode, RefObject } from "react";

type DictionarySearchBarProps = {
  isKeyboardOpen: boolean;
  onAppend: (char: string) => void;
  onBackspace: () => void;
  onQueryChange: (value: string) => void;
  onSelectionChange: (start: number | null, end: number | null) => void;
  onToggleKeyboard: () => void;
  query: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  trailingControls?: ReactNode;
};

export function DictionarySearchBar({
  isKeyboardOpen,
  onAppend,
  onBackspace,
  onQueryChange,
  onSelectionChange,
  onToggleKeyboard,
  query,
  searchInputRef,
  trailingControls,
}: DictionarySearchBarProps) {
  const { t } = useLanguage();

  return (
    <SurfacePanel
      variant="elevated"
      shadow="panel"
      className="group relative z-30"
    >
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted transition-colors group-focus-within:text-coptic sm:left-6">
          <Search className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>

        <input
          id="dictionary-search-input"
          name="query"
          ref={searchInputRef}
          type="text"
          dir="ltr"
          aria-label={t("dict.searchPlaceholder")}
          enterKeyHint="search"
          placeholder={t("dict.searchPlaceholder")}
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            onSelectionChange(
              event.target.selectionStart,
              event.target.selectionEnd,
            );
          }}
          onClick={(event) =>
            onSelectionChange(
              event.currentTarget.selectionStart,
              event.currentTarget.selectionEnd,
            )
          }
          onFocus={(event) =>
            onSelectionChange(
              event.currentTarget.selectionStart,
              event.currentTarget.selectionEnd,
            )
          }
          onKeyUp={(event) =>
            onSelectionChange(
              event.currentTarget.selectionStart,
              event.currentTarget.selectionEnd,
            )
          }
          onSelect={(event) =>
            onSelectionChange(
              event.currentTarget.selectionStart,
              event.currentTarget.selectionEnd,
            )
          }
          className={cx(
            antinoou.className,
            "w-full rounded-lg bg-transparent p-4 pl-12 text-base text-ink transition-all placeholder:font-sans placeholder:text-muted/65 focus:outline-none focus:ring-2 focus:ring-accent/30 sm:p-6 sm:pl-16 sm:text-lg md:text-2xl",
            trailingControls ? "pr-36 sm:pr-44" : "pr-24 sm:pr-28",
          )}
        />

        <div className="absolute inset-y-0 right-3 flex items-center gap-1.5 sm:right-4 sm:gap-2">
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className={iconButtonClassName({
                className: "h-9 w-9 border-transparent sm:h-10 sm:w-10",
              })}
              aria-label={t("dict.clearSearch")}
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleKeyboard}
            className={iconButtonClassName({
              active: isKeyboardOpen,
              className: "h-9 w-9 border-transparent sm:h-10 sm:w-10",
            })}
            aria-label={
              isKeyboardOpen ? t("dict.keyboardClose") : t("dict.keyboardOpen")
            }
            aria-pressed={isKeyboardOpen}
            title={
              isKeyboardOpen ? t("dict.keyboardClose") : t("dict.keyboardOpen")
            }
          >
            <Keyboard className="h-5 w-5" />
          </button>
          {trailingControls}
        </div>

        <CopticKeyboard
          isOpen={isKeyboardOpen}
          onAppend={onAppend}
          onBackspace={onBackspace}
        />
      </div>
    </SurfacePanel>
  );
}
