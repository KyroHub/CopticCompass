"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Brain,
  Camera,
  Copy,
  Download,
  ExternalLink,
  FlaskConical,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Minus,
  ScanText,
  SendHorizontal,
  SlidersHorizontal,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { processOCRImage } from "@/actions/ocrActions";
import {
  AuthGateInlinePrompt,
  AuthGateNotice,
} from "@/components/AuthGateNotice";
import { Badge } from "@/components/Badge";
import {
  buttonClassName,
  iconButtonClassName as sharedIconButtonClassName,
} from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import {
  SHENUTE_HANDOFF_STORAGE_KEY,
  type ShenuteHandoffMessage,
  type ShenuteHandoffPayload,
  type ShenuteHandoffPageContext,
} from "@/features/shenute/handoff";
import {
  copyTextToClipboard,
  findPreviousUserMessage,
  formatElapsedTime,
  getMessageText,
  getThinkingStatusMessage,
  type ChatMessageLike,
  type ShenuteFeedbackSignal,
  type ShenuteProvider,
  type ShenuteReactionSignal,
} from "@/features/shenute/shared";
import { cx } from "@/lib/classes";
import { createClient } from "@/lib/supabase/client";
import { useOptionalAuthGate } from "@/lib/supabase/useOptionalAuthGate";
import type { Language } from "@/types/i18n";

type FeedbackStateByMessage = Record<
  string,
  {
    message: string;
    status: "error" | "pending" | "success";
  }
>;

type PageContextPayload = {
  excerpt: string;
  path: string;
  title: string;
  url: string;
};

const SITE_TITLE_SUFFIX_PATTERN = /\s+\|\s+Coptic Compass$/;
const LAUNCHER_SCROLLING_OPACITY = 0.52;
const LAUNCHER_SCROLL_IDLE_DELAY_MS = 720;
const MESSAGE_INPUT_MIN_HEIGHT = 40;
const MESSAGE_INPUT_MOBILE_MAX_HEIGHT = 112;
const MESSAGE_INPUT_MAX_HEIGHT = 136;
const FLOATING_SHENUTE_LAUNCHER_CLASS =
  "inline-flex h-12 w-12 items-center justify-center gap-2 rounded-lg border border-coptic/25 bg-surface/95 text-coptic shadow-panel backdrop-blur-md transition-colors hover:border-coptic/40 hover:bg-coptic-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coptic/30 dark:bg-surface/95 sm:h-auto sm:w-auto sm:px-5 sm:py-3 sm:text-sm sm:font-semibold";
const FLOATING_SHENUTE_ICON_BUTTON_CLASS =
  "h-9 w-9 shrink-0 border-line/70 bg-surface/75 px-0 text-muted shadow-none hover:translate-y-0 hover:border-coptic/30 hover:bg-elevated hover:text-ink focus-visible:ring-coptic/25";
const FLOATING_SHENUTE_PANEL_CLASS =
  "pointer-events-auto flex h-[min(42rem,calc(100dvh-4rem))] max-h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden rounded-t-lg border border-line/80 bg-surface/95 shadow-panel backdrop-blur-xl sm:h-[560px] sm:max-h-[calc(100dvh-7rem)] sm:w-[400px] sm:rounded-lg";

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

const floatingShenuteCopy = {
  en: {
    addImage: "Add image",
    adminNotePlaceholder:
      "Admin only: add written feedback tied to this prompt/response.",
    adminNoteTitle: "Admin learning note",
    aiMode: "Answer style",
    aiModeDescription: "Choose how Shenute should balance depth and speed.",
    answerStyleControls: "Change answer style",
    camera: "Camera",
    cameraAccessFailed: "Could not access camera.",
    cameraFeedNotReady: "Camera feed is not ready yet. Try again.",
    cameraNotReady: "Camera is not ready.",
    cameraUnsupported: "Camera is not supported on this device/browser.",
    capture: "Capture",
    captureFailed: "Could not capture image from camera.",
    close: "Close",
    closeAnswerStyleControls: "Close answer style controls",
    contextAware: "Page context",
    copiedResponse: "Copied.",
    copyResponse: "Copy",
    copyResponseManual: "Copy manually.",
    dislike: "Not helpful",
    emptyPrompt:
      "Ask anything about this page, Coptic grammar, vocabulary, or translation.",
    feedbackFailed: "Could not save feedback.",
    imageAttached: "Image attached",
    imageContext: "Image OCR Context",
    imageFromCamera: "camera",
    imageFromUpload: "upload",
    inputPlaceholder: "Ask Shenute...",
    like: "Helpful",
    minimize: "Minimize",
    noTextExtracted: "No text extracted from the selected image.",
    ocrFailed: "OCR failed for the selected image.",
    ocrPending: "OCR...",
    promptResolveFailed: "Could not resolve prompt/response for this feedback.",
    provider: "Style",
    providerGemini: "Fast answer",
    providerGeminiDescription:
      "Quicker help for direct grammar or vocabulary questions.",
    providerGeminiNmt: "Fast answer (RAG + NMT)",
    providerGeminiNmtDescription:
      "Gemini with strict retrieved-context grounding plus NMT translation hints.",
    providerHf: "Experimental",
    providerHfDescription: "A lighter experimental pass for comparison.",
    providerOpenRouter: "Reasoned answer",
    providerOpenRouterDescription:
      "More step-by-step structure for harder questions.",
    providerThoth: "Best answer",
    providerThothDescription: "The strongest default for Coptology questions.",
    ragWarning: "RAG ingest warning:",
    removeImage: "Remove",
    requestFailed: "Request failed.",
    responseFeedbackActions: "Feedback",
    responseUseActions: "Use answer",
    runningOcr: "Running OCR...",
    saved: "Saved.",
    savedRag: "Saved and added to RAG learning.",
    savingFeedback: "Saving feedback...",
    selectedForOcrAlt: "Selected for OCR",
    send: "Send",
    signInBody:
      "Sign in to use Shenute AI on this page, ask follow-up questions, and send OCR-backed prompts.",
    signInFeedback: "Sign in to send learning feedback signals",
    signInTitle: "Sign in required",
    stopResponse: "Stop response",
    submitAdminNote: "Submit admin note",
    thinking: "Thinking...",
    thinkingComposing: "Composing answer",
    thinkingInitial: "Preparing answer",
    thinkingLong: "Still working",
    thinkingSearching: "Checking sources",
    fullWorkspace: "Open in Shenute AI",
    fullWorkspaceHint: "Continue this page-aware thread in the full workspace.",
    saveHistory: "Download transcript",
    savedHistory: "Transcript downloaded.",
    writeAdminFeedback: "Write admin feedback before submitting.",
  },
  nl: {
    addImage: "Afbeelding",
    adminNotePlaceholder:
      "Alleen admin: voeg feedback toe bij deze prompt en dit antwoord.",
    adminNoteTitle: "Leer-notitie voor beheerder",
    aiMode: "Antwoordstijl",
    aiModeDescription: "Kies hoe Shenute diepgang en snelheid moet balanceren.",
    answerStyleControls: "Antwoordstijl wijzigen",
    camera: "Camera",
    cameraAccessFailed: "Geen toegang tot de camera.",
    cameraFeedNotReady: "De camerafeed is nog niet klaar. Probeer opnieuw.",
    cameraNotReady: "De camera is nog niet klaar.",
    cameraUnsupported:
      "Camera wordt niet ondersteund op dit apparaat of in deze browser.",
    capture: "Vastleggen",
    captureFailed: "Afbeelding kon niet uit de camera worden vastgelegd.",
    close: "Sluiten",
    closeAnswerStyleControls: "Antwoordstijl sluiten",
    contextAware: "Pagina-context",
    copiedResponse: "Gekopieerd.",
    copyResponse: "Kopiëren",
    copyResponseManual: "Handmatig kopiëren.",
    dislike: "Niet behulpzaam",
    emptyPrompt:
      "Stel een vraag over deze pagina, Koptische grammatica, woordenschat of vertaling.",
    feedbackFailed: "Feedback kon niet worden opgeslagen.",
    imageAttached: "Afbeelding toegevoegd",
    imageContext: "OCR-context van afbeelding",
    imageFromCamera: "camera",
    imageFromUpload: "upload",
    inputPlaceholder: "Vraag Shenute...",
    like: "Behulpzaam",
    minimize: "Minimaliseren",
    noTextExtracted:
      "Er is geen tekst uit de geselecteerde afbeelding gehaald.",
    ocrFailed: "OCR is mislukt voor de geselecteerde afbeelding.",
    ocrPending: "OCR...",
    promptResolveFailed:
      "Prompt en antwoord konden niet aan deze feedback worden gekoppeld.",
    provider: "Stijl",
    providerGemini: "Snel antwoord",
    providerGeminiDescription:
      "Snellere hulp voor directe grammatica- of woordenschatvragen.",
    providerGeminiNmt: "Snel antwoord (RAG + NMT)",
    providerGeminiNmtDescription:
      "Gemini met strikte contextverankering en NMT-vertaalsuggesties.",
    providerHf: "Experimenteel",
    providerHfDescription: "Een lichtere experimentele vergelijking.",
    providerOpenRouter: "Uitgewerkt antwoord",
    providerOpenRouterDescription:
      "Meer stapsgewijze structuur voor moeilijkere vragen.",
    providerThoth: "Beste antwoord",
    providerThothDescription:
      "De sterkste standaard voor koptologische vragen.",
    ragWarning: "RAG-invoerwaarschuwing:",
    removeImage: "Verwijderen",
    requestFailed: "Verzoek mislukt.",
    responseFeedbackActions: "Feedback",
    responseUseActions: "Antwoord gebruiken",
    runningOcr: "OCR uitvoeren...",
    saved: "Opgeslagen.",
    savedRag: "Opgeslagen en toegevoegd aan RAG-leren.",
    savingFeedback: "Feedback opslaan...",
    selectedForOcrAlt: "Geselecteerd voor OCR",
    send: "Versturen",
    signInBody:
      "Meld u aan om Shenute AI op deze pagina te gebruiken, vervolgvragen te stellen en OCR-prompts te versturen.",
    signInFeedback: "Meld u aan om leersignalen te versturen",
    signInTitle: "Aanmelden vereist",
    stopResponse: "Antwoord stoppen",
    submitAdminNote: "Adminnotitie versturen",
    thinking: "Denkt na...",
    thinkingComposing: "Antwoord opstellen",
    thinkingInitial: "Antwoord voorbereiden",
    thinkingLong: "Nog bezig",
    thinkingSearching: "Bronnen controleren",
    fullWorkspace: "Openen in Shenute AI",
    fullWorkspaceHint:
      "Ga verder met deze pagina-bewuste thread in de volledige werkruimte.",
    saveHistory: "Transcript downloaden",
    savedHistory: "Transcript gedownload.",
    writeAdminFeedback: "Schrijf adminfeedback voordat u die verstuurt.",
  },
} as const satisfies Record<Language, Record<string, string>>;

function formatChatHistory(
  messages: ChatMessageLike[],
  pageContext: PageContextPayload,
  provider: ShenuteProvider,
) {
  const lines: string[] = [];
  lines.push("Shenute AI chat history");
  lines.push(`Page: ${pageContext.title || pageContext.path || "unknown"}`);
  lines.push(`URL: ${pageContext.url || "unknown"}`);
  lines.push(`Provider: ${provider}`);
  lines.push(`Saved: ${new Date().toISOString()}`);
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

function serializeChatMessage(message: ChatMessageLike): ShenuteHandoffMessage {
  const text = getMessageText(message);

  return {
    content: text,
    id: message.id,
    parts: text ? [{ text, type: "text" }] : undefined,
    role: message.role,
  };
}

function toHandoffPageContext(
  pageContext: PageContextPayload,
): ShenuteHandoffPageContext {
  return {
    excerpt: pageContext.excerpt,
    path: pageContext.path,
    title: pageContext.title,
    url: pageContext.url,
  };
}

function getFeedbackStatusClass(status: "error" | "pending" | "success") {
  if (status === "error") {
    return "text-danger";
  }

  if (status === "pending") {
    return "text-muted";
  }

  return "text-coptic";
}

function buildPageContext(pathname: string): PageContextPayload {
  if (typeof window === "undefined") {
    return {
      excerpt: "",
      path: pathname,
      title: "",
      url: "",
    };
  }

  const title = document.title?.trim() ?? "";
  const url = window.location.href;

  const mainText = document.querySelector("main")?.textContent ?? "";
  const bodyText = document.body?.textContent ?? "";
  const extractedText =
    mainText.replace(/\s+/g, " ").trim().length > 0 ? mainText : bodyText;
  const excerpt = extractedText.replace(/\s+/g, " ").trim().slice(0, 3500);

  return {
    excerpt,
    path: pathname,
    title,
    url,
  };
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

function getPageContextLabel(
  pageContext: PageContextPayload,
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

type FloatingAiAssistantPanelProps = {
  initialOpen?: boolean;
};

export function FloatingAiAssistantPanel({
  initialOpen = false,
}: FloatingAiAssistantPanelProps) {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const copy = floatingShenuteCopy[language];
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [launcherOpacity, setLauncherOpacity] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [inferenceProvider, setInferenceProvider] =
    useState<ShenuteProvider>("thoth");
  const [isAnswerStylePanelOpen, setIsAnswerStylePanelOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<
    string | null
  >(null);
  const [selectedImageSource, setSelectedImageSource] = useState<
    "upload" | "camera" | null
  >(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [thinkingElapsedSeconds, setThinkingElapsedSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentMenuDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const shenuteSessionIdRef = useRef(crypto.randomUUID());

  const { isAuthenticated, isReady, user } = useOptionalAuthGate();
  const [selectedReactionByMessage, setSelectedReactionByMessage] = useState<
    Record<string, ShenuteReactionSignal>
  >({});
  const [adminFeedbackDraftByMessage, setAdminFeedbackDraftByMessage] =
    useState<Record<string, string>>({});
  const [feedbackStateByMessage, setFeedbackStateByMessage] =
    useState<FeedbackStateByMessage>({});
  const [messageActionStateByMessage, setMessageActionStateByMessage] =
    useState<FeedbackStateByMessage>({});
  const [canSubmitAdminFeedback, setCanSubmitAdminFeedback] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const pageContext = useMemo(() => buildPageContext(pathname), [pathname]);
  const pageContextLabel = useMemo(
    () => getPageContextLabel(pageContext, language),
    [language, pageContext],
  );
  const providerOptions = useMemo(
    () => [
      {
        description: copy.providerThothDescription,
        icon: Sparkles,
        label: copy.providerThoth,
        value: "thoth" as const,
      },
      {
        description: copy.providerGeminiDescription,
        icon: Zap,
        label: copy.providerGemini,
        value: "gemini" as const,
      },
      {
        description: copy.providerGeminiNmtDescription,
        icon: Zap,
        label: copy.providerGeminiNmt,
        value: "gemini_nmt" as const,
      },
      {
        description: copy.providerOpenRouterDescription,
        icon: Brain,
        label: copy.providerOpenRouter,
        value: "openrouter" as const,
      },
      {
        description: copy.providerHfDescription,
        icon: FlaskConical,
        label: copy.providerHf,
        value: "hf" as const,
      },
    ],
    [
      copy.providerGemini,
      copy.providerGeminiDescription,
      copy.providerGeminiNmt,
      copy.providerGeminiNmtDescription,
      copy.providerHf,
      copy.providerHfDescription,
      copy.providerOpenRouter,
      copy.providerOpenRouterDescription,
      copy.providerThoth,
      copy.providerThothDescription,
    ],
  );
  const selectedProviderOption =
    providerOptions.find((option) => option.value === inferenceProvider) ??
    providerOptions[0]!;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/shenute",
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
  });

  const isLoading = status !== "ready";
  const isShenuteAccessBlocked = isReady && !isAuthenticated;
  const typedMessages = messages as ChatMessageLike[];
  const hasPromptContent =
    inputValue.trim().length > 0 || Boolean(selectedImage);
  const isComposerDisabled = isLoading || ocrPending || isShenuteAccessBlocked;
  const canSubmitPrompt = hasPromptContent && !isComposerDisabled;
  const isAttachmentMenuDisabled = isComposerDisabled;
  const thinkingStatusMessage = getThinkingStatusMessage(
    thinkingElapsedSeconds,
    copy,
  );
  const thinkingElapsedLabel = formatElapsedTime(thinkingElapsedSeconds);
  const composerPlaceholder = copy.inputPlaceholder;

  let composerStateLabel: string | null = null;
  if (ocrPending) {
    composerStateLabel = copy.runningOcr;
  }

  let composerStateMeta: string | null = null;
  if (ocrPending && selectedImage) {
    composerStateMeta = selectedImage.name || copy.imageAttached;
  }

  const composerSubmitLabel = isLoading ? copy.stopResponse : copy.send;
  const iconButtonClassName = sharedIconButtonClassName({
    className: FLOATING_SHENUTE_ICON_BUTTON_CLASS,
  });
  const floatingContainerClassName = isOpen
    ? "fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:inset-auto sm:bottom-5 sm:right-5 sm:block"
    : "fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-50 opacity-[var(--floating-shenute-opacity)] transition-opacity duration-200 ease-out hover:opacity-100 focus-within:opacity-100 motion-reduce:transition-none sm:bottom-5 sm:right-5";
  const floatingContainerStyle = !isOpen
    ? ({
        "--floating-shenute-opacity": launcherOpacity.toFixed(2),
      } as CSSProperties)
    : undefined;
  let conversationContent: ReactNode;

  if (isShenuteAccessBlocked) {
    conversationContent = (
      <div className="flex h-full items-center">
        <AuthGateNotice
          align="left"
          className="w-full"
          size="comfortable"
          title={copy.signInTitle}
        >
          {copy.signInBody}
        </AuthGateNotice>
      </div>
    );
  } else if (messages.length === 0) {
    conversationContent = (
      <div className="rounded-lg border border-dashed border-accent/20 bg-accent-soft/55 px-3 py-4 text-sm leading-6 text-muted dark:bg-accent-soft/25">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-coptic shadow-sm">
          <span className="font-coptic leading-none">Ϣ</span>
        </div>
        <p>{copy.emptyPrompt}</p>
      </div>
    );
  } else {
    conversationContent = messages.map((message, index) => {
      const assistantMessage = message as ChatMessageLike;
      const promptMessage =
        message.role === "assistant"
          ? findPreviousUserMessage(typedMessages, index)
          : null;
      const feedbackState = feedbackStateByMessage[message.id];
      const messageActionState = messageActionStateByMessage[message.id];
      const selectedReaction = selectedReactionByMessage[message.id];
      const adminDraft = adminFeedbackDraftByMessage[message.id] ?? "";
      const isFeedbackPending = feedbackState?.status === "pending";

      return (
        <article
          key={message.id}
          className={
            message.role === "user"
              ? "ml-8 rounded-lg rounded-br-md bg-coptic px-3.5 py-2.5 font-coptic text-[0.98rem] leading-6 text-white shadow-sm dark:text-paper"
              : "mr-5 rounded-lg rounded-bl-md border border-line/80 bg-surface/95 px-3.5 py-2.5 font-coptic text-[0.98rem] leading-6 text-ink shadow-sm ring-1 ring-line/60"
          }
        >
          {(() => {
            const text = getMessageText(message);
            if (!text) {
              return null;
            }

            return (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noreferrer"
                      className={cx(
                        "underline underline-offset-4",
                        message.role === "user"
                          ? "decoration-white/60 hover:decoration-white"
                          : "decoration-accent/45 hover:decoration-accent",
                      )}
                    />
                  ),
                  code: ({ className, children, ...props }) => (
                    <code
                      className={cx(
                        "rounded px-1 py-0.5 text-[0.95em]",
                        message.role === "user"
                          ? "bg-white/15 text-white"
                          : "bg-elevated text-ink",
                        className,
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  ),
                }}
              >
                {text}
              </ReactMarkdown>
            );
          })()}

          {message.role === "assistant" ? (
            <div className="mt-3 space-y-2 border-t border-line/80 pt-2 font-sans text-[11px]">
              <section className="space-y-1.5">
                <p className="font-semibold uppercase tracking-[0.14em] text-muted">
                  {copy.responseUseActions}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleCopyMessage(assistantMessage);
                    }}
                    className={buttonClassName({
                      size: "sm",
                      variant: "secondary",
                      className: "h-8 gap-1.5 px-2 text-xs",
                    })}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {copy.copyResponse}
                  </button>
                  <Link
                    href="/shenute"
                    onClick={persistShenuteHandoff}
                    title={copy.fullWorkspaceHint}
                    className={buttonClassName({
                      size: "sm",
                      variant: "secondary",
                      className: "h-8 gap-1.5 px-2 text-xs",
                    })}
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {copy.fullWorkspace}
                  </Link>
                </div>
              </section>

              <section className="space-y-1.5">
                <p className="font-semibold uppercase tracking-[0.14em] text-muted">
                  {copy.responseFeedbackActions}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-label={copy.like}
                    title={copy.like}
                    onClick={() => {
                      void handleReaction(
                        "like",
                        assistantMessage,
                        promptMessage,
                      );
                    }}
                    disabled={!isAuthenticated || isFeedbackPending}
                    className={buttonClassName({
                      size: "sm",
                      variant: "secondary",
                      className: cx(
                        "h-8 gap-1.5 px-2 text-xs",
                        selectedReaction === "like" &&
                          "border-coptic/35 bg-coptic-soft text-coptic",
                      ),
                    })}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                    {copy.like}
                  </button>
                  <button
                    type="button"
                    aria-label={copy.dislike}
                    title={copy.dislike}
                    onClick={() => {
                      void handleReaction(
                        "dislike",
                        assistantMessage,
                        promptMessage,
                      );
                    }}
                    disabled={!isAuthenticated || isFeedbackPending}
                    className={buttonClassName({
                      size: "sm",
                      variant: "secondary",
                      className: cx(
                        "h-8 gap-1.5 px-2 text-xs",
                        selectedReaction === "dislike" &&
                          "border-danger/35 bg-danger/5 text-danger dark:bg-danger/10",
                      ),
                    })}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                    {copy.dislike}
                  </button>
                </div>
              </section>

              {canSubmitAdminFeedback ? (
                <details className="rounded-lg border border-line/80 bg-elevated/60 p-2">
                  <summary className="cursor-pointer font-semibold text-ink">
                    {copy.adminNoteTitle}
                  </summary>
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={adminDraft}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAdminFeedbackDraftByMessage((current) => ({
                          ...current,
                          [message.id]: value,
                        }));
                      }}
                      placeholder={copy.adminNotePlaceholder}
                      rows={3}
                      disabled={isFeedbackPending}
                      className="w-full rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink focus:border-accent/55 focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void handleAdminFeedbackSubmit(
                          assistantMessage,
                          promptMessage,
                        );
                      }}
                      disabled={isFeedbackPending}
                      className={buttonClassName({
                        size: "sm",
                        variant: "secondary",
                        className: "h-8 px-2 text-xs",
                      })}
                    >
                      {copy.submitAdminNote}
                    </button>
                  </div>
                </details>
              ) : null}

              {messageActionState ? (
                <p
                  className={getFeedbackStatusClass(messageActionState.status)}
                >
                  {messageActionState.message}
                </p>
              ) : null}

              {feedbackState ? (
                <p className={getFeedbackStatusClass(feedbackState.status)}>
                  {feedbackState.message}
                </p>
              ) : null}

              {!isAuthenticated && isReady ? (
                <AuthGateInlinePrompt
                  className="text-[11px]"
                  message={copy.signInFeedback}
                />
              ) : null}
            </div>
          ) : null}
        </article>
      );
    });
  }

  function clearSelectedImage() {
    setSelectedImage(null);
    setSelectedImageSource(null);
    setOcrError(null);
    setCameraError(null);
    setSelectedImagePreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return null;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSaveChatHistory() {
    const historyText = formatChatHistory(
      typedMessages,
      pageContext,
      inferenceProvider,
    );
    const blob = new Blob([historyText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `shenute-chat-history-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);

    setSaveStatus(copy.savedHistory);
    window.setTimeout(() => setSaveStatus(null), 3000);
  }

  function setImageAttachment(file: File, source: "upload" | "camera") {
    setSelectedImagePreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return URL.createObjectURL(file);
    });

    setSelectedImage(file);
    setSelectedImageSource(source);
    setOcrError(null);
  }

  function stopCamera() {
    const stream = cameraStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
  }

  async function openCamera() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(copy.cameraUnsupported);
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch (cameraOpenError) {
      setCameraError(
        cameraOpenError instanceof Error
          ? cameraOpenError.message
          : copy.cameraAccessFailed,
      );
    }
  }

  async function captureFromCamera() {
    const videoElement = videoRef.current;
    const canvasElement = captureCanvasRef.current;

    if (!videoElement || !canvasElement) {
      setCameraError(copy.cameraNotReady);
      return;
    }

    const width = videoElement.videoWidth || 1280;
    const height = videoElement.videoHeight || 720;

    if (width <= 0 || height <= 0) {
      setCameraError(copy.cameraFeedNotReady);
      return;
    }

    canvasElement.width = width;
    canvasElement.height = height;
    const context = canvasElement.getContext("2d");
    if (!context) {
      setCameraError(copy.captureFailed);
      return;
    }

    context.drawImage(videoElement, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvasElement.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError(copy.captureFailed);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
    const capturedFile = new File([blob], `camera-${timestamp}.jpg`, {
      type: "image/jpeg",
    });

    setImageAttachment(capturedFile, "camera");
    stopCamera();
  }

  useEffect(() => {
    const stream = cameraStreamRef.current;
    if (!cameraOpen || !stream || !videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
    void videoRef.current.play().catch(() => {
      // Ignore autoplay rejections; user can still capture after manual interaction.
    });
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
      setSelectedImagePreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return null;
      });
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    let restoreTimeout: number | undefined;
    const handleScroll = () => {
      setLauncherOpacity(LAUNCHER_SCROLLING_OPACITY);
      if (restoreTimeout !== undefined) {
        window.clearTimeout(restoreTimeout);
      }
      restoreTimeout = window.setTimeout(() => {
        setLauncherOpacity(1);
        restoreTimeout = undefined;
      }, LAUNCHER_SCROLL_IDLE_DELAY_MS);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (restoreTimeout !== undefined) {
        window.clearTimeout(restoreTimeout);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isLoading) {
      setThinkingElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    setThinkingElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setThinkingElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!isAnswerStylePanelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAnswerStylePanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnswerStylePanelOpen]);

  useEffect(() => {
    if (!isAttachmentMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const details = attachmentMenuDetailsRef.current;
      if (!details || details.contains(event.target as Node)) {
        return;
      }

      details.open = false;
      setIsAttachmentMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isAttachmentMenuOpen]);

  useEffect(() => {
    const textarea = messageInputRef.current;
    if (!textarea) {
      return;
    }

    if (inputValue.length === 0) {
      textarea.style.height = `${MESSAGE_INPUT_MIN_HEIGHT}px`;
      return;
    }

    textarea.style.height = "auto";
    const isMobileViewport = window.matchMedia("(max-width: 639px)").matches;
    const maxInputHeight = isMobileViewport
      ? MESSAGE_INPUT_MOBILE_MAX_HEIGHT
      : MESSAGE_INPUT_MAX_HEIGHT;
    textarea.style.height = `${Math.min(
      Math.max(textarea.scrollHeight, MESSAGE_INPUT_MIN_HEIGHT),
      maxInputHeight,
    )}px`;
  }, [inputValue]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setCanSubmitAdminFeedback(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setCanSubmitAdminFeedback(false);
      return;
    }

    let isMounted = true;
    const loadAdminFeedbackAccess = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        setCanSubmitAdminFeedback(data?.role === "admin");
      } catch {
        if (isMounted) {
          setCanSubmitAdminFeedback(false);
        }
      }
    };

    void loadAdminFeedbackAccess();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id]);

  function closeAttachmentMenu() {
    if (attachmentMenuDetailsRef.current) {
      attachmentMenuDetailsRef.current.open = false;
    }

    setIsAttachmentMenuOpen(false);
  }

  function handlePromptKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function handleStopResponseFromComposer() {
    stop();
    setIsAnswerStylePanelOpen(false);
    closeAttachmentMenu();
    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus({ preventScroll: true });
    });
  }

  function setTemporaryMessageActionState(
    messageId: string,
    message: string,
    status: "error" | "pending" | "success",
  ) {
    setMessageActionStateByMessage((current) => ({
      ...current,
      [messageId]: { message, status },
    }));
    window.setTimeout(() => {
      setMessageActionStateByMessage((current) => {
        if (current[messageId]?.message !== message) {
          return current;
        }

        const next = { ...current };
        delete next[messageId];
        return next;
      });
    }, 2500);
  }

  async function handleCopyMessage(message: ChatMessageLike) {
    const text = getMessageText(message);
    if (!text) {
      return;
    }

    const didCopy = await copyTextToClipboard(text);
    setTemporaryMessageActionState(
      message.id,
      didCopy ? copy.copiedResponse : copy.copyResponseManual,
      didCopy ? "success" : "pending",
    );
  }

  function persistShenuteHandoff() {
    if (typeof window === "undefined") {
      return;
    }

    const payload: ShenuteHandoffPayload = {
      createdAt: new Date().toISOString(),
      inferenceProvider,
      messages: typedMessages.map(serializeChatMessage),
      pageContext: toHandoffPageContext(buildPageContext(pathname)),
      source: "floating",
    };

    try {
      window.sessionStorage.setItem(
        SHENUTE_HANDOFF_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch {
      // If session storage is unavailable, the link still opens the workspace.
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isShenuteAccessBlocked) {
      return;
    }

    const trimmed = inputValue.trim();
    if ((!trimmed && !selectedImage) || isComposerDisabled) {
      return;
    }

    let composedPrompt = trimmed;

    if (selectedImage) {
      setOcrPending(true);
      setOcrError(null);

      try {
        const ocrFormData = new FormData();
        ocrFormData.append("file", selectedImage);
        const ocrText = await processOCRImage(ocrFormData);
        const trimmedOcrText = ocrText
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 6000);

        composedPrompt = [
          composedPrompt,
          `[${copy.imageContext}]`,
          `Image: ${selectedImage.name}`,
          trimmedOcrText,
        ]
          .filter((part) => part.length > 0)
          .join("\n\n");
      } catch (ocrProcessingError) {
        setOcrError(
          ocrProcessingError instanceof Error
            ? ocrProcessingError.message
            : copy.ocrFailed,
        );
        setOcrPending(false);
        return;
      } finally {
        setOcrPending(false);
      }
    }

    if (!composedPrompt.trim()) {
      setOcrError(copy.noTextExtracted);
      return;
    }

    const freshContext = buildPageContext(pathname);

    sendMessage(
      { text: composedPrompt },
      {
        body: {
          inferenceProvider,
          pageContext: freshContext,
        },
      },
    );
    setInputValue("");
    setIsAnswerStylePanelOpen(false);
    closeAttachmentMenu();
    clearSelectedImage();
  }

  async function submitFeedbackSignal(options: {
    assistantMessage: ChatMessageLike;
    feedbackText?: string;
    promptMessage: ChatMessageLike | null;
    signal: ShenuteFeedbackSignal;
  }) {
    if (!isAuthenticated) {
      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message: copy.signInFeedback,
          status: "error",
        },
      }));
      return false;
    }

    const assistantResponse = getMessageText(options.assistantMessage);
    const prompt = options.promptMessage
      ? getMessageText(options.promptMessage)
      : "";

    if (!assistantResponse || !prompt) {
      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message: copy.promptResolveFailed,
          status: "error",
        },
      }));
      return false;
    }

    setFeedbackStateByMessage((current) => ({
      ...current,
      [options.assistantMessage.id]: {
        message: copy.savingFeedback,
        status: "pending",
      },
    }));

    try {
      const response = await fetch("/api/shenute/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistantMessageId: options.assistantMessage.id,
          assistantResponse,
          shenuteSessionId: shenuteSessionIdRef.current,
          feedbackText: options.feedbackText,
          inferenceProvider,
          pageContext,
          prompt,
          signal: options.signal,
          userMessageId: options.promptMessage?.id,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        ragIngested?: boolean;
        ragWarning?: string;
        success?: boolean;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? copy.feedbackFailed);
      }

      let successMessage: string = copy.saved;
      if (payload.ragIngested) {
        successMessage = copy.savedRag;
      } else if (payload.ragWarning) {
        successMessage = `${copy.saved} ${copy.ragWarning} ${payload.ragWarning}`;
      }

      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message: successMessage,
          status: "success",
        },
      }));

      return true;
    } catch (feedbackError) {
      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message:
            feedbackError instanceof Error
              ? feedbackError.message
              : copy.feedbackFailed,
          status: "error",
        },
      }));
      return false;
    }
  }

  async function handleReaction(
    signal: ShenuteReactionSignal,
    assistantMessage: ChatMessageLike,
    promptMessage: ChatMessageLike | null,
  ) {
    const success = await submitFeedbackSignal({
      assistantMessage,
      promptMessage,
      signal,
    });

    if (!success) {
      return;
    }

    setSelectedReactionByMessage((current) => ({
      ...current,
      [assistantMessage.id]: signal,
    }));
  }

  async function handleAdminFeedbackSubmit(
    assistantMessage: ChatMessageLike,
    promptMessage: ChatMessageLike | null,
  ) {
    const draft =
      adminFeedbackDraftByMessage[assistantMessage.id]?.trim() ?? "";
    if (!draft) {
      setFeedbackStateByMessage((current) => ({
        ...current,
        [assistantMessage.id]: {
          message: copy.writeAdminFeedback,
          status: "error",
        },
      }));
      return;
    }

    const success = await submitFeedbackSignal({
      assistantMessage,
      feedbackText: draft,
      promptMessage,
      signal: "admin_feedback",
    });

    if (!success) {
      return;
    }

    setAdminFeedbackDraftByMessage((current) => ({
      ...current,
      [assistantMessage.id]: "",
    }));
  }

  return (
    <div
      className={floatingContainerClassName}
      data-testid={!isOpen ? "floating-shenute-launcher" : undefined}
      style={floatingContainerStyle}
    >
      {isOpen ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 z-0 cursor-default bg-ink/15 backdrop-blur-[1px] pointer-events-auto sm:hidden"
            onClick={() => {
              setIsOpen(false);
            }}
          />
          <section
            className={cx(FLOATING_SHENUTE_PANEL_CLASS, "relative z-10")}
          >
            <header className="border-b border-line/80 bg-surface/80 px-4 py-3">
              <div
                aria-hidden="true"
                className="mx-auto mb-2 h-1 w-10 rounded-full bg-line sm:hidden"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coptic-soft text-coptic shadow-sm">
                    <span className="font-coptic leading-none">Ϣ</span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      Shenute AI
                    </p>
                    <Badge
                      tone="coptic"
                      size="xs"
                      className="mt-1 max-w-full truncate px-2 py-0.5 text-[11px]"
                    >
                      {copy.contextAware}: {pageContextLabel}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {saveStatus ? (
                    <span className="hidden max-w-24 truncate text-[11px] font-medium text-coptic sm:inline">
                      {saveStatus}
                    </span>
                  ) : null}
                  <Link
                    href="/shenute"
                    aria-label={copy.fullWorkspace}
                    title={copy.fullWorkspaceHint}
                    onClick={persistShenuteHandoff}
                    className={iconButtonClassName}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    aria-label={copy.saveHistory}
                    title={copy.saveHistory}
                    onClick={handleSaveChatHistory}
                    disabled={typedMessages.length === 0}
                    className={iconButtonClassName}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={copy.minimize}
                    title={copy.minimize}
                    onClick={() => {
                      setIsOpen(false);
                    }}
                    className={iconButtonClassName}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </header>

            <div className="border-b border-line/80 px-4 py-2.5">
              <button
                type="button"
                aria-expanded={isAnswerStylePanelOpen}
                aria-label={copy.answerStyleControls}
                title={copy.answerStyleControls}
                onClick={() => {
                  setIsAnswerStylePanelOpen((current) => !current);
                }}
                disabled={isLoading || isShenuteAccessBlocked}
                className={buttonClassName({
                  fullWidth: true,
                  size: "sm",
                  variant: "secondary",
                  className:
                    "h-10 justify-start gap-2 border-line/80 bg-surface/80 px-3 text-left text-xs",
                })}
              >
                <SlidersHorizontal
                  className="h-4 w-4 shrink-0 text-coptic"
                  aria-hidden="true"
                />
                <span className="shrink-0 font-semibold uppercase tracking-[0.14em] text-muted">
                  {copy.provider}
                </span>
                <span className="min-w-0 flex-1 truncate text-ink">
                  {selectedProviderOption.label}
                </span>
              </button>
              {isAnswerStylePanelOpen ? (
                <div
                  role="dialog"
                  aria-label={copy.aiMode}
                  className="mt-2 rounded-lg border border-line/80 bg-elevated/70 p-2 shadow-soft"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-ink">
                        {copy.aiMode}
                      </p>
                      <p className="text-[11px] leading-4 text-muted">
                        {copy.aiModeDescription}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={copy.closeAnswerStyleControls}
                      title={copy.closeAnswerStyleControls}
                      onClick={() => setIsAnswerStylePanelOpen(false)}
                      className={sharedIconButtonClassName({
                        className:
                          "h-7 w-7 shrink-0 border-line/70 bg-surface/80 text-muted shadow-none",
                      })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label={copy.aiMode}
                    className="grid gap-1.5 sm:grid-cols-2"
                  >
                    {providerOptions.map((option) => {
                      const Icon = option.icon;
                      const isActive = option.value === inferenceProvider;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          aria-label={`${option.label}. ${option.description}`}
                          onClick={() => {
                            setInferenceProvider(option.value);
                            setIsAnswerStylePanelOpen(false);
                          }}
                          disabled={isLoading || isShenuteAccessBlocked}
                          className={cx(
                            "flex min-h-10 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60",
                            isActive
                              ? "border-coptic/55 bg-coptic-soft text-ink shadow-sm"
                              : "border-line bg-surface/80 text-muted hover:border-accent/35 hover:bg-elevated hover:text-ink",
                          )}
                        >
                          <span
                            className={cx(
                              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                              isActive
                                ? "bg-coptic text-paper"
                                : "bg-elevated text-muted",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {option.label}
                            </span>
                            <span className="block truncate text-[11px] font-normal">
                              {option.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-elevated/45 p-3">
              {conversationContent}

              {isLoading ? (
                <div
                  aria-live="polite"
                  className="mr-8 flex min-w-0 items-center gap-2 rounded-lg rounded-bl-md border border-line/80 bg-surface/95 px-3 py-2 text-sm text-muted shadow-sm"
                >
                  <span
                    aria-hidden="true"
                    className="relative flex h-2.5 w-2.5 shrink-0"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coptic/40" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coptic" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                    {thinkingStatusMessage}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {thinkingElapsedLabel}
                  </span>
                </div>
              ) : null}
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-line/80 bg-surface/90 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
            >
              {error ? (
                <p className="mb-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs text-danger dark:bg-danger/10">
                  {error.message || copy.requestFailed}
                </p>
              ) : null}
              {ocrError ? (
                <p className="mb-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs text-danger dark:bg-danger/10">
                  {ocrError}
                </p>
              ) : null}
              {cameraError ? (
                <p className="mb-2 rounded-lg border border-warning/20 bg-accent-soft/75 px-3 py-2 text-xs text-accent-strong dark:text-accent">
                  {cameraError}
                </p>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setImageAttachment(file, "upload");
                  }
                }}
              />

              {cameraOpen ? (
                <div className="mb-2 rounded-lg border border-line/80 bg-elevated/65 p-2">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="mb-2 w-full rounded-lg border border-line/80"
                  />
                  <canvas ref={captureCanvasRef} className="hidden" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void captureFromCamera();
                      }}
                      className={buttonClassName({
                        size: "sm",
                        variant: "primary",
                        className: "h-9 text-xs",
                      })}
                    >
                      <ScanText className="h-3.5 w-3.5" />
                      {copy.capture}
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className={buttonClassName({
                        size: "sm",
                        variant: "secondary",
                        className: "h-9 text-xs",
                      })}
                    >
                      {copy.close}
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedImagePreviewUrl ? (
                <div className="mb-2 flex items-center gap-3 rounded-lg border border-line/80 bg-elevated/65 p-2">
                  <Image
                    unoptimized
                    src={selectedImagePreviewUrl}
                    alt={copy.selectedForOcrAlt}
                    width={72}
                    height={72}
                    className="h-14 w-14 shrink-0 rounded-lg border border-line/80 bg-surface object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-[11px] font-semibold text-ink">
                        {copy.imageAttached}
                      </span>
                      <Badge tone="accent" size="xs">
                        {selectedImageSource === "camera"
                          ? copy.imageFromCamera
                          : copy.imageFromUpload}
                      </Badge>
                      {ocrPending ? (
                        <Badge tone="neutral" size="xs">
                          {copy.ocrPending}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-[11px] text-muted">
                      {selectedImage?.name}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <button
                      type="button"
                      aria-label={copy.removeImage}
                      title={copy.removeImage}
                      onClick={clearSelectedImage}
                      className={buttonClassName({
                        size: "sm",
                        variant: "secondary",
                        className:
                          "h-8 w-8 border-danger/25 px-0 text-danger hover:bg-danger/5 dark:hover:bg-danger/10",
                      })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex items-end gap-2 rounded-lg border border-line/80 bg-surface/95 p-2 shadow-soft">
                <details
                  ref={attachmentMenuDetailsRef}
                  className="group relative shrink-0"
                  onToggle={(event) => {
                    setIsAttachmentMenuOpen(event.currentTarget.open);
                  }}
                >
                  <summary
                    aria-disabled={isAttachmentMenuDisabled}
                    aria-label={`${copy.addImage} / ${copy.camera}`}
                    onClick={(event) => {
                      if (isAttachmentMenuDisabled) {
                        event.preventDefault();
                      }
                    }}
                    tabIndex={isAttachmentMenuDisabled ? -1 : 0}
                    title={`${copy.addImage} / ${copy.camera}`}
                    className={cx(
                      buttonClassName({
                        size: "sm",
                        variant: "secondary",
                        className:
                          "h-10 w-10 cursor-pointer list-none rounded-lg px-0 [&::-webkit-details-marker]:hidden",
                      }),
                      isAttachmentMenuDisabled &&
                        "pointer-events-none opacity-55",
                    )}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </summary>
                  <div className="absolute bottom-full left-0 z-30 mb-2 w-52 rounded-lg border border-line/80 bg-surface p-2 shadow-panel">
                    <button
                      type="button"
                      onClick={() => {
                        closeAttachmentMenu();
                        fileInputRef.current?.click();
                      }}
                      disabled={isAttachmentMenuDisabled}
                      className={buttonClassName({
                        fullWidth: true,
                        size: "sm",
                        variant: "secondary",
                        className: "h-9 justify-start gap-2 px-3 text-xs",
                      })}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {copy.addImage}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeAttachmentMenu();
                        void openCamera();
                      }}
                      disabled={isAttachmentMenuDisabled || cameraOpen}
                      className={buttonClassName({
                        fullWidth: true,
                        size: "sm",
                        variant: "secondary",
                        className: "mt-2 h-9 justify-start gap-2 px-3 text-xs",
                      })}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {copy.camera}
                    </button>
                  </div>
                </details>
                <textarea
                  ref={messageInputRef}
                  rows={1}
                  enterKeyHint="send"
                  value={inputValue}
                  onChange={(event) => {
                    setInputValue(event.target.value);
                  }}
                  onKeyDown={handlePromptKeyDown}
                  placeholder={composerPlaceholder}
                  className="max-h-28 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border-0 bg-transparent px-2 py-2 text-sm leading-6 text-ink outline-none placeholder:text-muted/70 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-muted/75 sm:max-h-[136px]"
                  disabled={isComposerDisabled}
                />
                {isLoading ? (
                  <button
                    type="button"
                    aria-label={copy.stopResponse}
                    title={copy.stopResponse}
                    onClick={handleStopResponseFromComposer}
                    className={buttonClassName({
                      size: "sm",
                      variant: "secondary",
                      className:
                        "h-10 w-10 shrink-0 rounded-lg border-coptic/45 bg-coptic-soft px-0 text-coptic hover:bg-coptic-soft",
                    })}
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label={composerSubmitLabel}
                    title={composerSubmitLabel}
                    disabled={!canSubmitPrompt}
                    className={buttonClassName({
                      size: "sm",
                      variant: "primary",
                      className:
                        "h-10 w-10 shrink-0 rounded-lg px-0 disabled:hover:opacity-55",
                    })}
                  >
                    {ocrPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              {composerStateLabel ? (
                <div
                  aria-live="polite"
                  className="mt-1.5 flex min-w-0 items-center gap-2 rounded-lg bg-surface/65 px-2.5 py-1.5 text-xs text-muted"
                >
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-strong dark:text-accent"
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                    {composerStateLabel}
                  </span>
                  {composerStateMeta ? (
                    <span className="min-w-0 shrink truncate text-muted">
                      {composerStateMeta}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </form>
          </section>
        </>
      ) : null}

      {!isOpen ? (
        <button
          type="button"
          aria-label={t("shenute.launcher.open")}
          title={t("shenute.launcher.open")}
          onClick={() => {
            setIsOpen(true);
          }}
          className={FLOATING_SHENUTE_LAUNCHER_CLASS}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">
            {t("shenute.launcher.open")}
          </span>
        </button>
      ) : null}
    </div>
  );
}
