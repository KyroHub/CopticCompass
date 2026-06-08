import { Delete } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { SurfacePanel } from "@/components/SurfacePanel";

const COPTIC_LETTERS = [
  "ⲁ",
  "ⲃ",
  "ⲅ",
  "ⲇ",
  "ⲉ",
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
const DIACRITICS = ["\u0300", "\u0304", "\u0308"];

interface CopticKeyboardProps {
  onAppend: (char: string) => void;
  onBackspace: () => void;
  isOpen: boolean;
}

/**
 * Renders the on-screen Coptic keyboard used by dictionary search inputs,
 * including separate diacritics and a backspace control.
 */
export default function CopticKeyboard({
  onAppend,
  onBackspace,
  isOpen,
}: CopticKeyboardProps) {
  const { t } = useLanguage();

  if (!isOpen) {
    return null;
  }

  return (
    <SurfacePanel
      variant="elevated"
      shadow="panel"
      className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] max-h-[70vh] w-full overflow-y-auto p-3 sm:p-4 md:w-[640px] md:p-5"
    >
      <div className="mb-3 sm:mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-ink">
          {t("dict.keyboardTitle")}
        </h3>
      </div>

      <div className="mb-3 grid grid-cols-8 gap-1.5 sm:mb-4 sm:gap-2.5">
        {COPTIC_LETTERS.map((char) => (
          <button
            type="button"
            key={char}
            onClick={() => onAppend(char)}
            className="flex h-10 cursor-pointer select-none items-center justify-center rounded-lg border border-line bg-elevated/70 font-coptic text-xl text-ink shadow-sm transition-colors hover:border-coptic/35 hover:bg-coptic-soft hover:text-coptic active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:h-12 sm:text-2xl"
          >
            {char}
          </button>
        ))}
      </div>

      <div className="mb-2 flex gap-1.5 sm:mb-2.5 sm:gap-2.5">
        {DIACRITICS.map((char) => (
          <button
            type="button"
            key={char}
            onClick={() => onAppend(char)}
            aria-label={`${t("dict.keyboardCombine")}: ◌${char}`}
            className="flex h-10 flex-1 cursor-pointer select-none items-center justify-center rounded-lg border border-accent/25 bg-accent-soft/70 text-ink transition-colors hover:border-accent/45 hover:bg-accent-soft active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:h-11"
            title={t("dict.keyboardCombine")}
          >
            <span
              className={`font-coptic inline-flex items-center text-2xl leading-none text-accent-strong dark:text-accent sm:text-3xl`}
            >
              {`◌${char}`}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={onBackspace}
          className="flex h-10 flex-1 cursor-pointer select-none flex-col items-center justify-center rounded-lg border border-danger/25 bg-danger/5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 dark:bg-danger/10 sm:h-11"
          aria-label={t("dict.keyboardBackspace")}
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
      <div className="flex">
        <button
          type="button"
          onClick={() => onAppend(" ")}
          className="flex h-10 w-full cursor-pointer select-none items-center justify-center rounded-lg border border-line bg-elevated text-sm font-semibold uppercase tracking-widest text-muted transition-colors hover:bg-surface hover:text-ink active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:h-11"
        >
          {t("dict.keyboardSpace")}
        </button>
      </div>
    </SurfacePanel>
  );
}
