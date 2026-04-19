import { X } from "lucide-react";
import React from "react";

import { antinoou } from "@/lib/fonts";

const COPTIC_LETTERS = [
  "ⲁ",
  "ⲃ",
  "ⲅ",
  "ⲇ",
  "ⲉ",
  "ⲋ",
  "ⲍ",
  "ⲏ",
  "ⲑ",
  "ⲓ",
  "ⲕ",
  "ⲗ",
  "ⲙ",
  "ⲛ",
  "ⲝ",
  "ⲟ",
  "ⲡ",
  "ⲣ",
  "ⲥ",
  "ⲧ",
  "ⲩ",
  "ⲫ",
  "ⲭ",
  "ⲯ",
  "ⲱ",
  "ϣ",
  "ϥ",
  "ⳳ",
  "ϩ",
  "ϫ",
  "ϭ",
  "ϯ",
];

/**
 * Keep diacritics separate so users can compose them onto the previous base
 * letter instead of choosing from every possible precombined glyph.
 */
const DIACRITICS = [
  { char: "\u0300", label: "̀  (Jinkim)" },
  { char: "\u0304", label: "̄  (Stroke)" },
  { char: "\u0308", label: "̈  (Diaeresis)" },
];

interface CopticKeyboardProps {
  onAppend: (char: string) => void;
  onBackspace: () => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Renders the on-screen Coptic keyboard used by dictionary search inputs,
 * including separate diacritics and a backspace control.
 */
export default function CopticKeyboard({
  onAppend,
  onBackspace,
  isOpen,
  onClose,
}: CopticKeyboardProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute top-[calc(100%+0.75rem)] right-0 z-[70] w-full md:w-[640px] bg-white/95 dark:bg-stone-900/92 backdrop-blur-xl border border-stone-200 dark:border-stone-700/80 rounded-3xl p-4 md:p-5 shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-stone-600 dark:text-stone-300 font-semibold text-sm tracking-widest uppercase">
            Virtual Keyboard
          </h3>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
            Insert Coptic letters and diacritics directly into search.
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:text-stone-700 dark:bg-stone-800/70 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-8 gap-2.5 mb-4">
        {COPTIC_LETTERS.map((char) => (
          <button
            key={char}
            onClick={() => onAppend(char)}
            className="h-12 flex items-center justify-center font-coptic text-2xl text-stone-700 dark:text-stone-200 bg-stone-100/80 dark:bg-stone-800/80 hover:bg-sky-100 dark:hover:bg-sky-600/50 hover:text-sky-700 dark:hover:text-white rounded-xl border border-stone-200 dark:border-stone-700 transition-colors shadow-sm active:scale-95"
          >
            {char}
          </button>
        ))}
      </div>

      <div className="flex gap-2.5 mb-2.5">
        {DIACRITICS.map((d) => (
          <button
            key={d.label}
            onClick={() => onAppend(d.char)}
            className="flex-1 h-11 flex items-center justify-center text-lg text-stone-700 dark:text-stone-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl border border-emerald-200 dark:border-emerald-900/50 transition-colors active:scale-95"
            title="Combine with previous letter"
          >
            <span
              className={`${antinoou.className} mr-2 inline-flex items-center text-xl leading-none opacity-60`}
            >
              {`◌${d.char}`}
            </span>
            <span className="text-xs font-sans font-medium text-emerald-600 dark:text-emerald-500/80">
              {d.label.replace(d.char, "").trim()}
            </span>
          </button>
        ))}

        <button
          onClick={onBackspace}
          className="flex flex-col flex-1 h-11 items-center justify-center text-sm font-semibold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors active:scale-95"
          aria-label="Backspace"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
            />
          </svg>
        </button>
      </div>
      <div className="flex">
        <button
          onClick={() => onAppend(" ")}
          className="w-full h-11 flex items-center justify-center font-semibold text-sm tracking-widest text-stone-600 dark:text-stone-400 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 rounded-xl border border-stone-300 dark:border-stone-700 transition-colors active:scale-95 uppercase"
        >
          Space
        </button>
      </div>
    </div>
  );
}
