export type TypedFlashcardAnswerResult = "correct" | "empty" | "incorrect";

const COMBINING_MARKS_PATTERN =
  /[\u0300-\u036f\u0483-\u0489\u1dc0-\u1dff\u20d0-\u20ff\u2cef-\u2cf1\ufe20-\ufe2f]/g;
const IGNORED_SEPARATOR_PATTERN = /[\s.,;:!?'"`’‘“”·•·⸱()[\]{}<>/\\|_=+†~*-]+/g;

/**
 * Normalizes typed answers for forgiving Coptic comparison by removing
 * combining marks, casing differences, separators, and editorial punctuation.
 */
export function normalizeTypedFlashcardAnswer(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(COMBINING_MARKS_PATTERN, "")
    .replace(IGNORED_SEPARATOR_PATTERN, "");
}

/**
 * Compares a typed answer against the expected answer after normalization,
 * preserving an explicit empty state for UI feedback.
 */
export function compareTypedFlashcardAnswer({
  expected,
  input,
}: {
  expected: string;
  input: string;
}): TypedFlashcardAnswerResult {
  const normalizedInput = normalizeTypedFlashcardAnswer(input);

  if (!normalizedInput) {
    return "empty";
  }

  return normalizedInput === normalizeTypedFlashcardAnswer(expected)
    ? "correct"
    : "incorrect";
}
