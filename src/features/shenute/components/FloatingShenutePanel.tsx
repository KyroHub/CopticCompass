"use client";

/* eslint-disable react-hooks/set-state-in-effect -- Floating Shenute uses existing timer-driven chat state that is not compiler-clean yet. */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { processOCRImage } from "@/actions/ocrActions";
import { useLanguage } from "@/components/LanguageProvider";
import {
  SHENUTE_HANDOFF_STORAGE_KEY,
  type ShenuteHandoffMessage,
  type ShenuteHandoffPayload,
  type ShenuteHandoffPageContext,
} from "@/features/shenute/handoff";
import {
  copyTextToClipboard,
  formatElapsedTime,
  getMessageText,
  getThinkingStatusMessage,
  type ChatMessageLike,
  type ShenuteFeedbackSignal,
  type ShenuteProvider,
  type ShenuteReactionSignal,
} from "@/features/shenute/shared";
import { cx } from "@/lib/classes";
import { getPublicErrorMessage, isAppErrorCode } from "@/lib/errors";
import { getPublicOcrErrorMessage } from "@/lib/ocrErrors";
import { createClient } from "@/lib/supabase/client";
import { useOptionalAuthGate } from "@/lib/supabase/useOptionalAuthGate";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { Language } from "@/types/i18n";

import { FLOATING_SHENUTE_CONTAINER_CLASS } from "./floatingShenuteClasses";
import { FloatingShenuteComposer } from "./FloatingShenuteComposer";
import { FloatingShenuteHeader } from "./FloatingShenuteHeader";
import { FloatingShenuteMessages } from "./FloatingShenuteMessages";
import { FloatingShenuteProviderControls } from "./FloatingShenuteProviderControls";
import { FloatingShenuteTrigger } from "./FloatingShenuteTrigger";
import { FloatingShenuteWindow } from "./FloatingShenuteWindow";
import { useFloatingShenutePanelState } from "./useFloatingShenutePanelState";
import { useShenuteImageAttachment } from "./useShenuteImageAttachment";
import { useShenuteProviderSelection } from "./useShenuteProviderSelection";
import { useShenuteTextareaAutosize } from "./useShenuteTextareaAutosize";
import { useShenuteThinkingTimer } from "./useShenuteThinkingTimer";

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
const MESSAGE_INPUT_MIN_HEIGHT = 40;
const MESSAGE_INPUT_MOBILE_MAX_HEIGHT = 112;
const MESSAGE_INPUT_MAX_HEIGHT = 136;
const MOBILE_VIEWPORT_MEDIA_QUERY = "(max-width: 639px)";

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
    requestFailed:
      "Shenute is having trouble answering right now. Please try again in a moment.",
    responseFeedbackActions: "Feedback",
    responseUseActions: "Use answer",
    runningOcr: "Running OCR...",
    saved: "Saved.",
    savedRag: "Saved and added to RAG learning.",
    savedLearningDelayed: "Saved. The learning sync will catch up later.",
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
    requestFailed:
      "Shenute heeft nu moeite met antwoorden. Probeer het zo opnieuw.",
    responseFeedbackActions: "Feedback",
    responseUseActions: "Antwoord gebruiken",
    runningOcr: "OCR uitvoeren...",
    saved: "Opgeslagen.",
    savedRag: "Opgeslagen en toegevoegd aan RAG-leren.",
    savedLearningDelayed:
      "Opgeslagen. De leersynchronisatie wordt later bijgewerkt.",
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

type FloatingShenuteCopy =
  (typeof floatingShenuteCopy)[keyof typeof floatingShenuteCopy];

type FeedbackResponsePayload = {
  code?: unknown;
  ragIngested?: boolean;
  ragWarning?: boolean;
  success?: boolean;
};

function getFeedbackErrorMessage(
  payload: FeedbackResponsePayload,
  copy: FloatingShenuteCopy,
  language: Language,
) {
  return isAppErrorCode(payload.code)
    ? getPublicErrorMessage(payload.code, language, "feedback")
    : copy.feedbackFailed;
}

async function readFeedbackResponsePayload(response: Response) {
  try {
    return (await response.json()) as FeedbackResponsePayload;
  } catch {
    return { success: false } satisfies FeedbackResponsePayload;
  }
}

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

type FloatingShenutePanelProps = {
  initialOpen?: boolean;
};

export function FloatingShenutePanel({
  initialOpen = false,
}: FloatingShenutePanelProps) {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const isMobileViewport = useMediaQuery(MOBILE_VIEWPORT_MEDIA_QUERY);
  const copy = floatingShenuteCopy[language];
  const { isOpen, launcherOpacity, setIsOpen } = useFloatingShenutePanelState({
    initialOpen,
  });
  const [inputValue, setInputValue] = useState("");
  const {
    inferenceProvider,
    providerOptions,
    selectedProviderOption,
    setInferenceProvider,
  } = useShenuteProviderSelection(copy);
  const [isAnswerStylePanelOpen, setIsAnswerStylePanelOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const attachmentMenuDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const shenuteSessionIdRef = useRef(crypto.randomUUID());
  const {
    cameraError,
    cameraOpen,
    captureCanvasRef,
    captureFromCamera,
    clearSelectedImage,
    fileInputRef,
    openCamera,
    selectedImage,
    selectedImagePreviewUrl,
    selectedImageSource,
    setImageAttachment,
    stopCamera,
    videoRef,
  } = useShenuteImageAttachment({
    copy: {
      cameraAccessFailed: copy.cameraAccessFailed,
      cameraFrameFailed: copy.captureFailed,
      cameraImageFailed: copy.captureFailed,
      cameraNotReady: copy.cameraNotReady,
      cameraNotSupported: copy.cameraUnsupported,
      cameraStillLoading: copy.cameraFeedNotReady,
    },
    onAttachmentChange: () => setOcrError(null),
  });

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
  const thinkingElapsedSeconds = useShenuteThinkingTimer(isLoading);
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
  const floatingContainerClassName = isOpen
    ? "fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:inset-auto sm:bottom-5 sm:right-5 sm:block"
    : cx(
        FLOATING_SHENUTE_CONTAINER_CLASS,
        "opacity-[var(--floating-shenute-opacity)]",
      );
  const floatingContainerStyle = !isOpen
    ? ({
        "--floating-shenute-opacity": launcherOpacity.toFixed(2),
      } as CSSProperties)
    : undefined;
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

  useEffect(() => {
    if (!isAnswerStylePanelOpen) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
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

  useShenuteTextareaAutosize({
    inputValue,
    isMobileViewport,
    maxHeight: MESSAGE_INPUT_MAX_HEIGHT,
    minHeight: MESSAGE_INPUT_MIN_HEIGHT,
    mobileMaxHeight: MESSAGE_INPUT_MOBILE_MAX_HEIGHT,
    textareaRef: messageInputRef,
  });

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

  function handlePromptKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
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
    } catch {}
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        setOcrError(getPublicOcrErrorMessage(ocrProcessingError, language));
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

      const payload = await readFeedbackResponsePayload(response);

      if (!response.ok || !payload.success) {
        setFeedbackStateByMessage((current) => ({
          ...current,
          [options.assistantMessage.id]: {
            message: getFeedbackErrorMessage(payload, copy, language),
            status: "error",
          },
        }));
        return false;
      }

      let successMessage: string = copy.saved;
      if (payload.ragIngested) {
        successMessage = copy.savedRag;
      } else if (payload.ragWarning) {
        successMessage = copy.savedLearningDelayed;
      }

      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message: successMessage,
          status: "success",
        },
      }));

      return true;
    } catch {
      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message: copy.feedbackFailed,
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
        <FloatingShenuteWindow onClose={() => setIsOpen(false)}>
          <FloatingShenuteHeader
            copy={copy}
            onMinimize={() => setIsOpen(false)}
            onOpenWorkspace={persistShenuteHandoff}
            onSaveHistory={handleSaveChatHistory}
            pageContextLabel={pageContextLabel}
            saveStatus={saveStatus}
            typedMessages={typedMessages}
          />
          <FloatingShenuteProviderControls
            copy={copy}
            inferenceProvider={inferenceProvider}
            isAnswerStylePanelOpen={isAnswerStylePanelOpen}
            isDisabled={isLoading || isShenuteAccessBlocked}
            onSelectProvider={(provider) => {
              setInferenceProvider(provider);
              setIsAnswerStylePanelOpen(false);
            }}
            onTogglePanel={() => {
              setIsAnswerStylePanelOpen((current) => !current);
            }}
            providerOptions={providerOptions}
            selectedProviderOption={selectedProviderOption}
          />
          <FloatingShenuteMessages
            adminFeedbackDraftByMessage={adminFeedbackDraftByMessage}
            canSubmitAdminFeedback={canSubmitAdminFeedback}
            copy={copy}
            feedbackStateByMessage={feedbackStateByMessage}
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            isReady={isReady}
            isShenuteAccessBlocked={isShenuteAccessBlocked}
            messageActionStateByMessage={messageActionStateByMessage}
            onAdminFeedbackDraftChange={(messageId, value) => {
              setAdminFeedbackDraftByMessage((current) => ({
                ...current,
                [messageId]: value,
              }));
            }}
            onAdminFeedbackSubmit={(assistantMessage, promptMessage) => {
              void handleAdminFeedbackSubmit(assistantMessage, promptMessage);
            }}
            onCopyMessage={(message) => {
              void handleCopyMessage(message);
            }}
            onOpenWorkspace={persistShenuteHandoff}
            onReaction={(signal, assistantMessage, promptMessage) => {
              void handleReaction(signal, assistantMessage, promptMessage);
            }}
            selectedReactionByMessage={selectedReactionByMessage}
            thinkingElapsedLabel={thinkingElapsedLabel}
            thinkingStatusMessage={thinkingStatusMessage}
            typedMessages={typedMessages}
          />
          <FloatingShenuteComposer
            attachmentMenuDetailsRef={attachmentMenuDetailsRef}
            cameraError={cameraError}
            cameraOpen={cameraOpen}
            canSubmitPrompt={canSubmitPrompt}
            captureCanvasRef={captureCanvasRef}
            composerPlaceholder={composerPlaceholder}
            composerStateLabel={composerStateLabel}
            composerStateMeta={composerStateMeta}
            composerSubmitLabel={composerSubmitLabel}
            copy={copy}
            error={error}
            fileInputRef={fileInputRef}
            inputValue={inputValue}
            isAttachmentMenuDisabled={isAttachmentMenuDisabled}
            isComposerDisabled={isComposerDisabled}
            isLoading={isLoading}
            messageInputRef={messageInputRef}
            ocrError={ocrError}
            ocrPending={ocrPending}
            onCaptureFromCamera={() => {
              void captureFromCamera();
            }}
            onClearSelectedImage={clearSelectedImage}
            onCloseAttachmentMenu={closeAttachmentMenu}
            onInputChange={setInputValue}
            onOpenCamera={() => {
              void openCamera();
            }}
            onPromptKeyDown={handlePromptKeyDown}
            onStopCamera={stopCamera}
            onStopResponse={handleStopResponseFromComposer}
            onSubmit={handleSubmit}
            onToggleAttachmentMenu={(event) => {
              setIsAttachmentMenuOpen(event.currentTarget.open);
            }}
            selectedImage={selectedImage}
            selectedImagePreviewUrl={selectedImagePreviewUrl}
            selectedImageSource={selectedImageSource}
            setImageAttachment={setImageAttachment}
            videoRef={videoRef}
          />
        </FloatingShenuteWindow>
      ) : null}

      {!isOpen ? (
        <FloatingShenuteTrigger
          label={t("shenute.launcher.open")}
          onClick={() => setIsOpen(true)}
        />
      ) : null}
    </div>
  );
}
