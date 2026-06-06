/**
 * Recovers JSON from model responses that may include prose, fenced code, or
 * partial object/array wrappers.
 */
export function tryParseJsonFromModelAnswer(answer: string): unknown {
  const trimmed = answer.trim();
  if (!trimmed) {
    return null;
  }

  const candidates: string[] = [trimmed];
  const fencedMatches = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const match of fencedMatches) {
    if (match[1]) {
      candidates.push(match[1].trim());
    }
  }

  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) {
    candidates.push(trimmed.slice(firstArray, lastArray + 1));
  }

  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    candidates.push(trimmed.slice(firstObject, lastObject + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}
