"use client";

import { Keyboard, Search, X } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { antinoou } from "@/lib/fonts";

import CopticKeyboard from "./CopticKeyboard";

import type { RefObject } from "react";

type DictionarySearchBarProps = {
  isKeyboardOpen: boolean;
  onAppend: (char: string) => void;
  onBackspace: () => void;
  onCloseKeyboard: () => void;
  onQueryChange: (value: string) => void;
  onSelectionChange: (start: number | null, end: number | null) => void;
  onToggleKeyboard: () => void;
  query: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
};

export function DictionarySearchBar({
  isKeyboardOpen,
  onAppend,
  onBackspace,
  onCloseKeyboard,
  onQueryChange,
  onSelectionChange,
  onToggleKeyboard,
  query,
  searchInputRef,
}: DictionarySearchBarProps) {
  const { t } = useLanguage();

  return (
    <div className="relative z-30 rounded-[1.75rem] border border-stone-200 bg-white/80 shadow-xl backdrop-blur-xl dark:border-stone-700/80 dark:bg-stone-900/80 dark:shadow-2xl">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-stone-500 transition-colors group-focus-within:text-sky-400">
          <Search className="h-6 w-6" />
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
          className={`${antinoou.className} w-full rounded-[1.75rem] bg-transparent p-6 pl-16 pr-28 text-lg text-stone-900 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/50 placeholder:font-sans placeholder:text-stone-400 dark:text-stone-100 dark:placeholder:text-stone-500 md:text-2xl`}
        />

        <div className="absolute inset-y-0 right-4 flex items-center gap-2">
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:text-stone-700 dark:bg-stone-800/70 dark:text-stone-400 dark:hover:text-stone-200"
              aria-label="Clear Search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={onToggleKeyboard}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isKeyboardOpen
                ? "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
                : "bg-stone-100 text-stone-500 hover:text-stone-700 dark:bg-stone-800/70 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
            aria-label="Toggle Virtual Keyboard"
            title="Open Coptic Keyboard"
          >
            <Keyboard className="h-5 w-5" />
          </button>
        </div>

        <CopticKeyboard
          isOpen={isKeyboardOpen}
          onClose={onCloseKeyboard}
          onAppend={onAppend}
          onBackspace={onBackspace}
        />
      </div>
    </div>
  );
}
