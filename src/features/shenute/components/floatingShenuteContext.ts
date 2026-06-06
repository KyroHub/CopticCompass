import {
  SHENUTE_HANDOFF_STORAGE_KEY,
  type ShenuteHandoffMessage,
  type ShenuteHandoffPageContext,
  type ShenuteHandoffPayload,
} from "@/features/shenute/handoff";
import {
  getMessageText,
  type ChatMessageLike,
  type ShenuteProvider,
} from "@/features/shenute/shared";
import type { Language } from "@/types/i18n";

export type FloatingShenutePageContext = {
  excerpt: string;
  path: string;
  title: string;
  url: string;
};

const SITE_TITLE_SUFFIX_PATTERN = /\s+\|\s+Coptic Compass$/;
const PAGE_CONTEXT_EXCERPT_LIMIT = 3500;

const PAGE_CONTEXT_LABELS: Record<Language, Record<string, string>> = {
  en: {
    admin: "Admin",
    analytics: "Analytics",
    "api-docs": "API docs",
    communications: "Communications",
    contact: "Contact",
    contributors: "Contributors",
    dashboard: "Dashboard",
    developers: "Developers",
    dictionary: "Dictionary",
    entry: "Dictionary",
    "forgot-password": "Forgot password",
    grammar: "Grammar",
    home: "Home",
    login: "Sign in",
    ocr: "OCR",
    privacy: "Privacy",
    publications: "Publications",
    shenute: "Shenute AI",
    terms: "Terms",
    "update-password": "Update password",
  },
  nl: {
    admin: "Admin",
    analytics: "Analytics",
    "api-docs": "API-documentatie",
    communications: "Communicatie",
    contact: "Contact",
    contributors: "Bijdragers",
    dashboard: "Dashboard",
    developers: "Ontwikkelaars",
    dictionary: "Woordenboek",
    entry: "Woordenboek",
    "forgot-password": "Wachtwoord vergeten",
    grammar: "Grammatica",
    home: "Home",
    login: "Inloggen",
    ocr: "OCR",
    privacy: "Privacy",
    publications: "Publicaties",
    shenute: "Shenute AI",
    terms: "Voorwaarden",
    "update-password": "Wachtwoord bijwerken",
  },
};

function normalizePageContextExcerpt(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, PAGE_CONTEXT_EXCERPT_LIMIT);
}

export function buildFloatingShenutePageContext({
  bodyText = "",
  mainText = "",
  pathname,
  title = "",
  url = "",
}: {
  bodyText?: string;
  mainText?: string;
  pathname: string;
  title?: string;
  url?: string;
}): FloatingShenutePageContext {
  const normalizedMainText = normalizePageContextExcerpt(mainText);
  const extractedText = normalizedMainText.length > 0 ? mainText : bodyText;

  return {
    excerpt: normalizePageContextExcerpt(extractedText),
    path: pathname,
    title: title.trim(),
    url,
  };
}

export function readFloatingShenutePageContext(
  pathname: string,
): FloatingShenutePageContext {
  if (typeof window === "undefined") {
    return buildFloatingShenutePageContext({ pathname });
  }

  return buildFloatingShenutePageContext({
    bodyText: document.body?.textContent ?? "",
    mainText: document.querySelector("main")?.textContent ?? "",
    pathname,
    title: document.title?.trim() ?? "",
    url: window.location.href,
  });
}

function getPageContextSegments(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment === "en" || firstSegment === "nl") {
    return segments.slice(1);
  }

  return segments;
}

function formatFallbackPageContextLabel(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getFloatingShenutePageContextLabel(
  pageContext: FloatingShenutePageContext,
  language: Language,
) {
  const labels = PAGE_CONTEXT_LABELS[language];
  const [section] = getPageContextSegments(pageContext.path);

  if (!section) {
    return labels.home;
  }

  const routeLabel = labels[section];
  if (routeLabel) {
    return routeLabel;
  }

  const title = pageContext.title.replace(SITE_TITLE_SUFFIX_PATTERN, "").trim();
  return title || formatFallbackPageContextLabel(section) || pageContext.path;
}

export function formatFloatingShenuteChatHistory(
  messages: ChatMessageLike[],
  pageContext: FloatingShenutePageContext,
  provider: ShenuteProvider,
  savedAt = new Date(),
) {
  const lines: string[] = [];
  lines.push("Shenute AI chat history");
  lines.push(`Page: ${pageContext.title || pageContext.path || "unknown"}`);
  lines.push(`URL: ${pageContext.url || "unknown"}`);
  lines.push(`Provider: ${provider}`);
  lines.push(`Saved: ${savedAt.toISOString()}`);
  lines.push("");

  for (const message of messages) {
    let role = "System";
    if (message.role === "user") {
      role = "User";
    } else if (message.role === "assistant") {
      role = "Assistant";
    }

    const text = getMessageText(message) || "[no text]";
    lines.push(`${role}:`);
    lines.push(text);
    lines.push("");
  }

  return lines.join("\n");
}

function serializeFloatingShenuteHandoffMessage(
  message: ChatMessageLike,
): ShenuteHandoffMessage {
  const text = getMessageText(message);

  return {
    content: text,
    id: message.id,
    parts: text ? [{ text, type: "text" }] : undefined,
    role: message.role,
  };
}

function toFloatingShenuteHandoffPageContext(
  pageContext: FloatingShenutePageContext,
): ShenuteHandoffPageContext {
  return {
    excerpt: pageContext.excerpt,
    path: pageContext.path,
    title: pageContext.title,
    url: pageContext.url,
  };
}

export function buildFloatingShenuteHandoffPayload({
  createdAt = new Date(),
  inferenceProvider,
  messages,
  pageContext,
}: {
  createdAt?: Date;
  inferenceProvider: ShenuteProvider;
  messages: ChatMessageLike[];
  pageContext: FloatingShenutePageContext;
}): ShenuteHandoffPayload {
  return {
    createdAt: createdAt.toISOString(),
    inferenceProvider,
    messages: messages.map(serializeFloatingShenuteHandoffMessage),
    pageContext: toFloatingShenuteHandoffPageContext(pageContext),
    source: "floating",
  };
}

export function persistFloatingShenuteHandoff({
  createdAt,
  inferenceProvider,
  messages,
  pageContext,
  storage = typeof window === "undefined" ? null : window.sessionStorage,
}: {
  createdAt?: Date;
  inferenceProvider: ShenuteProvider;
  messages: ChatMessageLike[];
  pageContext: FloatingShenutePageContext;
  storage?: Pick<Storage, "setItem"> | null;
}) {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      SHENUTE_HANDOFF_STORAGE_KEY,
      JSON.stringify(
        buildFloatingShenuteHandoffPayload({
          createdAt,
          inferenceProvider,
          messages,
          pageContext,
        }),
      ),
    );
    return true;
  } catch {
    return false;
  }
}
