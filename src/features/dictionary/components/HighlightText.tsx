import React from "react";

import { buildCopticSearchRegex } from "@/lib/copticSearch";
import { antinoou } from "@/lib/fonts";

import type { ReactNode } from "react";

const COPTIC_LEGACY_CHAR_CLASS = "\\u03E2-\\u03EF";
const COPTIC_CHAR_CLASS = `${COPTIC_LEGACY_CHAR_CLASS}\\u2C80-\\u2CFF`;
const COPTIC_COMBINING_CLASS = "\\u0300-\\u036f\\uFE20-\\uFE2F\\u0483-\\u0489";
/**
 * These fragments capture the shorthand that appears in imported glosses so we
 * can emphasize it without forcing the source data into a stricter schema.
 */
const LEADING_LABEL_FRAGMENTS = [
  "p\\.c\\.",
  "impers vb",
  "bijvoeglijk naamwoord",
  "voegwoord",
  "imperative",
  "adjective",
  "auxil",
  "intr",
  "qual",
  "kwal(?:iteit)?",
  "conj",
  "prep",
  "advb",
  "adj",
  "adv",
  "tr",
  "refl",
  "suff",
  "pref",
  "vb",
  "nn",
  "pron",
  "art",
  "int\\.?",
  "pc",
];
const INLINE_ABBREVIATION_FRAGMENTS = [
  "\\bbijvoeglijk naamwoord\\b",
  "\\bkwaliteit\\b",
  "\\bvoegwoord\\b",
  "p\\.c\\.",
  "\\bimpers\\b",
  "\\bimperative\\b",
  "\\bauxil\\b",
  "\\binterrog\\b",
  "\\bneg\\b",
  "\\bobj\\b",
  "\\bethic(?:al)?\\b",
  "\\bdat\\b",
  "\\bsuff\\b",
  "\\bpref\\b",
  "\\bpronom\\b",
  "\\bsubj\\b",
  "\\bpron\\b",
  "\\brel\\b",
  "\\bacc\\b",
  "\\bnom\\b",
  "\\bgen\\b",
  "\\bsg\\b",
  "\\bpl\\b",
  "\\bart\\b",
  "\\bdef\\b",
  "\\bindef\\b",
  "\\bposs\\b",
  "\\bgk\\b",
  "\\besp\\b",
  "\\blit\\b",
  "\\bcausative\\b",
  "\\bcaus\\b",
  "\\bsim\\b",
  "\\bprob\\b",
  "\\brare\\b",
  "\\bconstr\\b",
  "\\bvbal\\b",
  "\\bc\\b(?=\\s)",
  "\\bintr\\b",
  "\\bqual\\b",
  "\\bkwal\\b",
  "\\bconj\\b",
  "\\bprep\\b",
  "\\badvb\\b",
  "\\badj\\b",
  "\\badv\\b",
  "\\brefl\\b",
  "\\btr\\b",
  "\\bnn\\b",
  "\\bvb\\b",
  "\\bpc\\b",
  "\\bint\\.(?=$|[^A-Za-z0-9_])",
  "\\bint\\b",
];
const LEADING_LABEL_PATTERN = new RegExp(
  `^(${LEADING_LABEL_FRAGMENTS.join("|")})(?: ?\\([^)]*\\))?(?=$|[:., ]|-)`,
  "i",
);
const INLINE_ABBREVIATION_PATTERN = new RegExp(
  `(${INLINE_ABBREVIATION_FRAGMENTS.join("|")})`,
  "i",
);
const COPTIC_RUN_REGEX = new RegExp(
  `([${COPTIC_CHAR_CLASS}](?:[${COPTIC_CHAR_CLASS}${COPTIC_COMBINING_CLASS}]*)?)`,
  "g",
);

function renderWithSuperscript(
  text: string,
  keyPrefix: string,
  className?: string,
): ReactNode[] {
  const parts = text.split("†");
  const result: ReactNode[] = [];

  parts.forEach((part, i) => {
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

    if (i < parts.length - 1) {
      result.push(
        <sup key={`${keyPrefix}-dagger-${i}`} className="opacity-75">
          †
        </sup>,
      );
    }
  });

  return result;
}

function renderPlainTypography(
  text: string,
  keyPrefix: string,
  emphasizeAbbreviations: boolean,
): ReactNode[] {
  if (!emphasizeAbbreviations) {
    return renderWithSuperscript(text, keyPrefix);
  }

  const parts = text.split(INLINE_ABBREVIATION_PATTERN);
  const result: ReactNode[] = [];

  parts.forEach((part, i) => {
    if (!part) {
      return;
    }

    const className = i % 2 === 1 ? "font-bold" : undefined;
    result.push(...renderWithSuperscript(part, `${keyPrefix}-${i}`, className));
  });

  return result;
}

function renderWithCopticTypography(
  text: string,
  keyPrefix: string,
  emphasizeAbbreviations: boolean,
): ReactNode[] {
  const parts = text.split(COPTIC_RUN_REGEX);
  const result: ReactNode[] = [];

  parts.forEach((part, i) => {
    if (!part) {
      return;
    }

    if (i % 2 === 1) {
      result.push(
        ...renderWithSuperscript(part, `${keyPrefix}-${i}`, antinoou.className),
      );
    } else {
      result.push(
        ...renderPlainTypography(
          part,
          `${keyPrefix}-${i}`,
          emphasizeAbbreviations,
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
): ReactNode {
  if (!query) {
    return (
      <span className={className}>
        {renderWithCopticTypography(text, keyPrefix, emphasizeAbbreviations)}
      </span>
    );
  }

  const regex = buildCopticSearchRegex(query);
  if (!regex) {
    return (
      <span className={className}>
        {renderWithCopticTypography(text, keyPrefix, emphasizeAbbreviations)}
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
            className="bg-sky-200 dark:bg-sky-500/40 text-sky-900 dark:text-sky-100 rounded-[2px] px-[1px] font-bold"
          >
            {renderWithCopticTypography(
              part,
              `highlight-${i}`,
              emphasizeAbbreviations,
            )}
          </mark>
        ) : (
          <span key={i}>
            {renderWithCopticTypography(
              part,
              `plain-${i}`,
              emphasizeAbbreviations,
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
}: {
  text: string;
  query: string;
  className?: string;
  emphasizeLeadingLabel?: boolean;
}) {
  const safeText = text.replace(/<[^>]+>/g, "");
  const labelSplit = emphasizeLeadingLabel ? splitLeadingLabel(safeText) : null;

  if (!labelSplit) {
    return renderSearchableText(
      safeText,
      query,
      "plain",
      className,
      emphasizeLeadingLabel,
    );
  }

  return (
    <span className={className}>
      {renderSearchableText(labelSplit.label, query, "label", "font-bold")}
      {renderSearchableText(labelSplit.rest, query, "rest", "", true)}
    </span>
  );
}
