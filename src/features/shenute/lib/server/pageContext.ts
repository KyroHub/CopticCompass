import type { PageContext } from "./chatTypes";

export function toPageContext(value: unknown): PageContext {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as {
    excerpt?: unknown;
    path?: unknown;
    title?: unknown;
    url?: unknown;
  };

  const excerpt =
    typeof candidate.excerpt === "string"
      ? candidate.excerpt.replace(/\s+/g, " ").trim().slice(0, 2500)
      : undefined;
  const path =
    typeof candidate.path === "string"
      ? candidate.path.replace(/\s+/g, " ").trim().slice(0, 200)
      : undefined;
  const title =
    typeof candidate.title === "string"
      ? candidate.title.replace(/\s+/g, " ").trim().slice(0, 300)
      : undefined;
  const url =
    typeof candidate.url === "string"
      ? candidate.url.replace(/\s+/g, " ").trim().slice(0, 400)
      : undefined;

  return {
    excerpt,
    path,
    title,
    url,
  };
}
