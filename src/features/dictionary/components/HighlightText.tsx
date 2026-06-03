import React from "react";

import { MicroTooltip } from "@/components/MicroTooltip";
import {
  INLINE_GRAMMAR_ABBREVIATION_PATTERNS,
  LEADING_GRAMMAR_LABEL_PATTERNS,
} from "@/features/dictionary/grammarRegistry";
import { buildCopticSearchRegex } from "@/lib/copticSearch";
import { antinoou } from "@/lib/fonts";

import { LinguisticGloss } from "./LinguisticGloss";

import type { ReactNode } from "react";

type FormSymbol = "-" | "=" | "†" | "~";
export type FormSymbolTooltips = Partial<Record<FormSymbol, string>>;
export type GrammarAbbreviationTooltips = Partial<Record<string, string>>;

const COPTIC_LEGACY_CHAR_CLASS = "\\u03E2-\\u03EF";
const COPTIC_CHAR_CLASS = `${COPTIC_LEGACY_CHAR_CLASS}\\u2C80-\\u2CFF`;
const COPTIC_COMBINING_CLASS = "\\u0300-\\u036f\\uFE20-\\uFE2F\\u0483-\\u0489";
const FORM_SYMBOL_PATTERN = /([-=\u2020~])/;
const LEADING_LABEL_PATTERN = new RegExp(
  `^(${LEADING_GRAMMAR_LABEL_PATTERNS.join("|")})(?: ?\\([^)]*\\))?(?=$|[:., ]|-)`,
  "i",
);
const INLINE_ABBREVIATION_PATTERN = new RegExp(
  `(${INLINE_GRAMMAR_ABBREVIATION_PATTERNS.join("|")})`,
  "i",
);
const GRAMMAR_ABBREVIATION_PUNCTUATION_PATTERN = new RegExp(
  `\\b(${LEADING_GRAMMAR_LABEL_PATTERNS.join("|")})(?: ?\\([^)]*\\))?[:,]([ \\t]*)`,
  "gi",
);
const DIALECT_SIGLA_TRAILING_COMMA_PATTERN =
  /\b((?:Fb|Sa|Sf|Sl|A|B|F|L|M|O|S)+),([ \t]+)/g;
const COPTIC_RUN_REGEX = new RegExp(
  `([${COPTIC_CHAR_CLASS}](?:[${COPTIC_CHAR_CLASS}${COPTIC_COMBINING_CLASS}]*)?)`,
  "g",
);

function normalizeMeaningDisplayPunctuation(value: string) {
  return value
    .replace(
      GRAMMAR_ABBREVIATION_PUNCTUATION_PATTERN,
      (
        match,
        _label: string,
        _spacing: string,
        offset: number,
        fullValue: string,
      ) => {
        const nextCharacter = fullValue[offset + match.length];
        const separator =
          nextCharacter && nextCharacter !== "\r" && nextCharacter !== "\n"
            ? " "
            : "";

        return `${match.replace(/[:,][ \t]*$/, "")}${separator}`;
      },
    )
    .replace(DIALECT_SIGLA_TRAILING_COMMA_PATTERN, "$1 ");
}

function FormSymbolTooltip({
  className,
  label,
  symbol,
}: {
  className?: string;
  label: string;
  symbol: FormSymbol;
}) {
  return (
    <MicroTooltip label={label}>
      {renderFormSymbol(symbol, className)}
    </MicroTooltip>
  );
}

function getFormSymbolClassName(symbol: FormSymbol) {
  return symbol === "-" || symbol === "=" || symbol === "†"
    ? antinoou.className
    : undefined;
}

function renderFormSymbol(symbol: FormSymbol, className?: string) {
  if (symbol === "†") {
    return (
      <sup
        className={`align-super text-[0.65em] leading-none text-current ${
          className ?? ""
        }`.trim()}
      >
        †
      </sup>
    );
  }

  return className ? <span className={className}>{symbol}</span> : symbol;
}

function normalizeGrammarAbbreviationKey(value: string) {
  return value.toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ").trim();
}

function renderWithSuperscript(
  text: string,
  keyPrefix: string,
  className?: string,
  symbolTooltips?: FormSymbolTooltips,
): ReactNode[] {
  const parts = text.split(FORM_SYMBOL_PATTERN);
  const result: ReactNode[] = [];

  parts.forEach((part, i) => {
    if (!part) {
      return;
    }

    if (FORM_SYMBOL_PATTERN.test(part)) {
      const symbol = part as FormSymbol;
      const label = symbolTooltips?.[symbol];
      const symbolClassName = getFormSymbolClassName(symbol);
      let symbolContent: ReactNode = renderFormSymbol(symbol, symbolClassName);

      if (label) {
        symbolContent = (
          <FormSymbolTooltip
            className={symbolClassName}
            label={label}
            symbol={symbol}
          />
        );
      }

      result.push(
        <React.Fragment key={`${keyPrefix}-symbol-${i}`}>
          {symbolContent}
        </React.Fragment>,
      );

      return;
    }

    if (part) {
      result.push(
        className ? (
          <span key={`${keyPrefix}-text-${i}`} className={className}>
            {part}
          </span>
        ) : (
          <React.Fragment key={`${keyPrefix}-text-${i}`}>{part}</React.Fragment>
        ),
      );
    }
  });

  return result;
}

function renderPlainTypography(
  text: string,
  keyPrefix: string,
  emphasizeAbbreviations: boolean,
  symbolTooltips?: FormSymbolTooltips,
  grammarAbbreviationTooltips?: GrammarAbbreviationTooltips,
): ReactNode[] {
  if (!emphasizeAbbreviations) {
    return renderWithSuperscript(text, keyPrefix, undefined, symbolTooltips);
  }

  const parts = text.split(INLINE_ABBREVIATION_PATTERN);
  const result: ReactNode[] = [];

  parts.forEach((part, i) => {
    if (!part) {
      return;
    }

    if (i % 2 === 1) {
      result.push(
        <LinguisticGloss
          key={`${keyPrefix}-${i}`}
          code={part}
          label={
            grammarAbbreviationTooltips?.[normalizeGrammarAbbreviationKey(part)]
          }
          size="inline"
        />,
      );

      return;
    }

    result.push(
      ...renderWithSuperscript(
        part,
        `${keyPrefix}-${i}`,
        undefined,
        symbolTooltips,
      ),
    );
  });

  return result;
}

function renderWithCopticTypography(
  text: string,
  keyPrefix: string,
  emphasizeAbbreviations: boolean,
  symbolTooltips?: FormSymbolTooltips,
  grammarAbbreviationTooltips?: GrammarAbbreviationTooltips,
): ReactNode[] {
  const parts = text.split(COPTIC_RUN_REGEX);
  const result: ReactNode[] = [];

  parts.forEach((part, i) => {
    if (!part) {
      return;
    }

    if (i % 2 === 1) {
      result.push(
        ...renderWithSuperscript(
          part,
          `${keyPrefix}-${i}`,
          antinoou.className,
          symbolTooltips,
        ),
      );
    } else {
      result.push(
        ...renderPlainTypography(
          part,
          `${keyPrefix}-${i}`,
          emphasizeAbbreviations,
          symbolTooltips,
          grammarAbbreviationTooltips,
        ),
      );
    }
  });

  return result;
}

function renderSearchableText(
  text: string,
  query: string,
  keyPrefix: string,
  className = "",
  emphasizeAbbreviations = false,
  symbolTooltips?: FormSymbolTooltips,
  grammarAbbreviationTooltips?: GrammarAbbreviationTooltips,
): ReactNode {
  if (!query) {
    return (
      <span className={className}>
        {renderWithCopticTypography(
          text,
          keyPrefix,
          emphasizeAbbreviations,
          symbolTooltips,
          grammarAbbreviationTooltips,
        )}
      </span>
    );
  }

  const regex = buildCopticSearchRegex(query);
  if (!regex) {
    return (
      <span className={className}>
        {renderWithCopticTypography(
          text,
          keyPrefix,
          emphasizeAbbreviations,
          symbolTooltips,
          grammarAbbreviationTooltips,
        )}
      </span>
    );
  }

  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-[2px] bg-accent-soft px-[1px] font-bold text-accent-strong dark:text-accent"
          >
            {renderWithCopticTypography(
              part,
              `highlight-${i}`,
              emphasizeAbbreviations,
              symbolTooltips,
              grammarAbbreviationTooltips,
            )}
          </mark>
        ) : (
          <span key={i}>
            {renderWithCopticTypography(
              part,
              `plain-${i}`,
              emphasizeAbbreviations,
              symbolTooltips,
              grammarAbbreviationTooltips,
            )}
          </span>
        ),
      )}
    </span>
  );
}

function splitLeadingLabel(text: string) {
  const match = text.match(LEADING_LABEL_PATTERN);
  if (!match || match.index !== 0) {
    return null;
  }

  let label = match[0];
  let rest = text.slice(label.length);

  if (rest.startsWith(":") || rest.startsWith(",")) {
    label += rest[0];
    rest = rest.slice(1);
  }

  return { label, rest };
}

/**
 * Renders dictionary text with Coptic typography, optional grammar-label
 * emphasis, and query highlighting that respects combining-mark variants.
 */
export default function HighlightText({
  text,
  query,
  className = "",
  emphasizeLeadingLabel = false,
  grammarAbbreviationTooltips,
  symbolTooltips,
}: {
  text: string;
  query: string;
  className?: string;
  emphasizeLeadingLabel?: boolean;
  grammarAbbreviationTooltips?: GrammarAbbreviationTooltips;
  symbolTooltips?: FormSymbolTooltips;
}) {
  const safeText = normalizeMeaningDisplayPunctuation(
    text.replace(/<[^>]+>/g, ""),
  );
  const labelSplit = emphasizeLeadingLabel ? splitLeadingLabel(safeText) : null;

  if (!labelSplit) {
    return renderSearchableText(
      safeText,
      query,
      "plain",
      className,
      emphasizeLeadingLabel,
      symbolTooltips,
      grammarAbbreviationTooltips,
    );
  }

  return (
    <span className={className}>
      {renderSearchableText(
        labelSplit.label,
        query,
        "label",
        "",
        true,
        symbolTooltips,
        grammarAbbreviationTooltips,
      )}
      {renderSearchableText(
        labelSplit.rest,
        query,
        "rest",
        "",
        true,
        symbolTooltips,
        grammarAbbreviationTooltips,
      )}
    </span>
  );
}
