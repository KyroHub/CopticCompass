"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { processOCRImage } from "@/actions/ocrActions";
import {
  AuthGateInlinePrompt,
  AuthGateNotice,
} from "@/components/AuthGateNotice";
import { Badge } from "@/components/Badge";
import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";
import { getLocalizedHomePath } from "@/lib/locale";
import { useOptionalAuthGate } from "@/lib/supabase/useOptionalAuthGate";

type ChatProvider = "gemini" | "hf" | "openrouter";

type TextMessagePart = {
  text: string;
  type: "text";
};

type ChatMessageLike = {
  content?: unknown;
  id: string;
  parts?: unknown;
  role: "assistant" | "system" | "user";
};

type ChatFeedbackSignal = "admin_feedback" | "dislike" | "like";
type ChatReactionSignal = Extract<ChatFeedbackSignal, "dislike" | "like">;

type FeedbackStateByMessage = Record<
  string,
  {
    message: string;
    status: "error" | "pending" | "success";
  }
>;

const CHAT_ACCESS_REQUIRED_MESSAGE = "Please sign in to access Shenute AI.";

function isTextMessagePart(part: unknown): part is TextMessagePart {
  if (!part || typeof part !== "object") {
    return false;
  }

  const candidate = part as { text?: unknown; type?: unknown };
  return candidate.type === "text" && typeof candidate.text === "string";
}

function getMessageText(message: ChatMessageLike) {
  if (typeof message.content === "string") {
    return message.content.trim();
  }

  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .filter(isTextMessagePart)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function findPreviousUserMessage(
  messages: ChatMessageLike[],
  startIndex: number,
) {
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }

    const text = getMessageText(message);
    if (text.length > 0) {
      return message;
    }
  }

  return null;
}

function toChatProvider(value: string): ChatProvider {
  if (value === "gemini") {
    return "gemini";
  }

  if (value === "hf") {
    return "hf";
  }

  return "gemini";
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as { cause?: unknown; status?: unknown };
  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (candidate.cause && typeof candidate.cause === "object") {
    const cause = candidate.cause as { status?: unknown };
    if (typeof cause.status === "number") {
      return cause.status;
    }
  }

  return undefined;
}

function getChatErrorMessage(error: unknown) {
  const status = getErrorStatusCode(error);
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.toLowerCase();

  if (
    status === 429 ||
    normalizedMessage.includes("429") ||
    normalizedMessage.includes("rate limit")
  ) {
    return "Rate limit reached. Please try again later.";
  }

  if (
    status === 401 ||
    normalizedMessage.includes("401") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("sign in")
  ) {
    return CHAT_ACCESS_REQUIRED_MESSAGE;
  }

  return message || "AI request failed.";
}

function getFeedbackStatusClass(status: "error" | "pending" | "success") {
  if (status === "error") {
    return "text-rose-700 dark:text-rose-300";
  }

  if (status === "pending") {
    return "text-slate-600 dark:text-slate-300";
  }

  return "text-emerald-700 dark:text-emerald-300";
}

function getMessageAvatarClassName(role: ChatMessageLike["role"]) {
  if (role === "user") {
    return "bg-sky-600 text-white dark:bg-sky-500";
  }

  return "bg-emerald-600 text-white dark:bg-emerald-500";
}

function getMessageBubbleClassName(role: ChatMessageLike["role"]) {
  if (role === "user") {
    return "bg-sky-600 text-white shadow-md dark:bg-sky-500 rounded-tr-sm";
  }

  return "rounded-tl-sm border border-stone-200 bg-white/90 text-stone-800 shadow-sm dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200";
}

function getReactionButtonClassName(
  active: boolean,
  tone: "negative" | "positive",
) {
  if (active && tone === "positive") {
    return "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (active && tone === "negative") {
    return "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
  }

  return "border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800";
}

export default function ChatAI() {
  const { language, t } = useLanguage();
  const [inferenceProvider, setInferenceProvider] =
    useState<ChatProvider>("gemini");
  const [inputValue, setInputValue] = useState("");
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [chatAccessError, setChatAccessError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<
    string | null
  >(null);
  const [selectedImageSource, setSelectedImageSource] = useState<
    "upload" | "camera" | null
  >(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const chatSessionIdRef = useRef(crypto.randomUUID());

  const { isAuthenticated, isReady } = useOptionalAuthGate();
  const [selectedReactionByMessage, setSelectedReactionByMessage] = useState<
    Record<string, ChatReactionSignal>
  >({});
  const [adminFeedbackDraftByMessage, setAdminFeedbackDraftByMessage] =
    useState<Record<string, string>>({});
  const [feedbackStateByMessage, setFeedbackStateByMessage] =
    useState<FeedbackStateByMessage>({});

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          inferenceProvider,
        },
      }),
    [inferenceProvider],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });

  const isLoading = status !== "ready";
  const isChatAccessBlocked = isReady && !isAuthenticated;
  const typedMessages = messages as ChatMessageLike[];

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
      setCameraError("Camera is not supported on this device/browser.");
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
          : "Could not access camera.",
      );
    }
  }

  async function captureFromCamera() {
    const videoElement = videoRef.current;
    const canvasElement = captureCanvasRef.current;

    if (!videoElement || !canvasElement) {
      setCameraError("Camera is not ready.");
      return;
    }

    const width = videoElement.videoWidth || 1280;
    const height = videoElement.videoHeight || 720;

    if (width <= 0 || height <= 0) {
      setCameraError("Camera feed is not ready yet. Try again.");
      return;
    }

    canvasElement.width = width;
    canvasElement.height = height;
    const context = canvasElement.getContext("2d");
    if (!context) {
      setCameraError("Could not capture camera frame.");
      return;
    }

    context.drawImage(videoElement, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvasElement.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("Could not capture image from camera.");
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isChatAccessBlocked) {
      setChatAccessError(CHAT_ACCESS_REQUIRED_MESSAGE);
      return;
    }

    setChatAccessError(null);

    if ((!inputValue.trim() && !selectedImage) || isLoading || ocrPending) {
      return;
    }

    let composedPrompt = inputValue.trim();

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
          .slice(0, 8000);

        composedPrompt = [
          composedPrompt,
          "[Image OCR Context]",
          `Image: ${selectedImage.name}`,
          trimmedOcrText,
        ]
          .filter((part) => part.length > 0)
          .join("\n\n");
      } catch (ocrProcessingError) {
        setOcrError(
          ocrProcessingError instanceof Error
            ? ocrProcessingError.message
            : "OCR failed for the selected image.",
        );
        setOcrPending(false);
        return;
      } finally {
        setOcrPending(false);
      }
    }

    if (!composedPrompt.trim()) {
      setOcrError("No text extracted from the selected image.");
      return;
    }

    sendMessage({ text: composedPrompt });
    setInputValue("");
    clearSelectedImage();
  };

  async function submitFeedbackSignal(options: {
    assistantMessage: ChatMessageLike;
    feedbackText?: string;
    promptMessage: ChatMessageLike | null;
    signal: ChatFeedbackSignal;
  }) {
    if (!isAuthenticated) {
      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message: "Sign in to send feedback signals.",
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
          message: "Could not resolve prompt/response for this feedback.",
          status: "error",
        },
      }));
      return false;
    }

    setFeedbackStateByMessage((current) => ({
      ...current,
      [options.assistantMessage.id]: {
        message: "Saving feedback...",
        status: "pending",
      },
    }));

    try {
      const response = await fetch("/api/chat/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistantMessageId: options.assistantMessage.id,
          assistantResponse,
          chatId: chatSessionIdRef.current,
          feedbackText: options.feedbackText,
          inferenceProvider,
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
        throw new Error(payload.error ?? "Could not save feedback.");
      }

      let successMessage = "Saved.";
      if (payload.ragIngested) {
        successMessage = "Saved and added to RAG learning.";
      } else if (payload.ragWarning) {
        successMessage = `Saved. RAG ingest warning: ${payload.ragWarning}`;
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
              : "Could not save feedback.",
          status: "error",
        },
      }));
      return false;
    }
  }

  async function handleReaction(
    signal: ChatReactionSignal,
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
          message: "Write admin feedback before submitting.",
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
    <PageShell
      className="min-h-screen flex flex-col items-center p-6 pb-16 md:p-10"
      contentClassName="mx-auto w-full max-w-5xl space-y-6 pt-10"
      width="standard"
      accents={[
        pageShellAccents.heroSkyArc,
        pageShellAccents.topRightEmeraldOrbInset,
      ]}
    >
      <BreadcrumbTrail
        items={[
          { label: t("nav.home"), href: getLocalizedHomePath(language) },
          { label: t("nav.chat") },
        ]}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <PageHeader
            title="Shenute AI"
            description="Ask about Coptic vocabulary, grammar, translation, and manuscript context without leaving the shared app workspace."
            align="left"
            size="compact"
            tone="sky"
            titleClassName="pb-0"
            descriptionClassName="text-base md:text-lg"
          />
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-stone-600 dark:text-stone-300 lg:items-end">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
            Provider
          </span>
          <select
            id="chat-inference-provider"
            name="chat_inference_provider"
            className="compact-select-base min-w-[10.5rem] bg-white/85 text-sm dark:bg-stone-900"
            value={inferenceProvider}
            onChange={(event) => {
              setInferenceProvider(toChatProvider(event.target.value));
            }}
            disabled={isLoading || isChatAccessBlocked}
          >
            <option value="hf">Hugging Face</option>
            <option value="gemini">Gemini</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </label>
      </div>

      <SurfacePanel
        rounded="4xl"
        shadow="float"
        className="relative overflow-hidden"
      >
        {isChatAccessBlocked ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10 bg-white/10 backdrop-brightness-95 dark:bg-stone-950/10"
            />
            <div className="absolute inset-0 z-20 flex items-center justify-center p-6 md:p-10">
              <AuthGateNotice
                actionClassName="px-6"
                align="center"
                className="w-full max-w-lg shadow-xl"
                size="comfortable"
                title="Shenute AI"
              >
                {CHAT_ACCESS_REQUIRED_MESSAGE}
              </AuthGateNotice>
            </div>
          </>
        ) : null}

        <div
          className={cx(
            "flex min-h-[72vh] flex-col transition-all duration-300",
            isChatAccessBlocked &&
              "pointer-events-none select-none blur-[6px] opacity-70",
          )}
        >
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8 md:p-12">
              <SurfacePanel
                rounded="4xl"
                variant="subtle"
                shadow="soft"
                className="max-w-xl p-8 text-center"
              >
                <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-3xl text-sky-700 shadow-sm dark:bg-sky-900/30 dark:text-sky-300">
                  <span className="font-coptic leading-none">Ϣ</span>
                </div>
                <h2 className="mb-3 text-2xl font-semibold text-stone-900 dark:text-stone-100">
                  Welcome to Shenute AI
                </h2>
                <p className="text-stone-600 dark:text-stone-400">
                  Start with a word, a grammar question, or an image attachment
                  and Shenute AI will keep the conversation grounded in your
                  Coptic study workflow.
                </p>
              </SurfacePanel>
            </div>
          ) : (
            <div
              aria-live="polite"
              className="flex-1 space-y-5 overflow-y-auto border-b border-stone-200/80 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-950/30 md:p-6"
            >
              {messages.map((m, index) => {
                const assistantMessage = m as ChatMessageLike;
                const promptMessage =
                  m.role === "assistant"
                    ? findPreviousUserMessage(typedMessages, index)
                    : null;
                const feedbackState = feedbackStateByMessage[m.id];
                const selectedReaction = selectedReactionByMessage[m.id];
                const adminDraft = adminFeedbackDraftByMessage[m.id] ?? "";
                const isFeedbackPending = feedbackState?.status === "pending";

                return (
                  <div
                    key={m.id}
                    className={cx(
                      "flex max-w-[85%] gap-3",
                      m.role === "user"
                        ? "ml-auto flex-row-reverse"
                        : "mr-auto",
                    )}
                  >
                    <div
                      className={cx(
                        "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm",
                        getMessageAvatarClassName(m.role),
                      )}
                    >
                      {m.role === "user" ? (
                        "U"
                      ) : (
                        <span className="font-coptic text-base leading-none">
                          Ϣ
                        </span>
                      )}
                    </div>
                    <div
                      className={cx(
                        "rounded-2xl px-4 py-3 font-coptic text-lg leading-relaxed md:text-xl",
                        getMessageBubbleClassName(m.role),
                      )}
                    >
                      {Array.isArray(m.parts) ? (
                        m.parts
                          .filter(isTextMessagePart)
                          .map((part, partIndex: number) => {
                            if (part.type !== "text") {
                              return null;
                            }
                            if (m.role === "assistant") {
                              return (
                                <ReactMarkdown
                                  key={partIndex}
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    a: ({ ...props }) => (
                                      <a
                                        {...props}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline"
                                      />
                                    ),
                                    code: ({
                                      className,
                                      children,
                                      ...props
                                    }) => (
                                      <code
                                        className={`rounded bg-stone-200/70 px-1 py-0.5 text-[0.95em] dark:bg-stone-800 ${className || ""}`}
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    ),
                                  }}
                                >
                                  {part.text}
                                </ReactMarkdown>
                              );
                            }

                            return <p key={partIndex}>{part.text}</p>;
                          })
                      ) : (
                        <p>{getMessageText(m)}</p>
                      )}

                      {m.role === "assistant" ? (
                        <div className="mt-3 space-y-2 border-t border-stone-200 pt-3 text-xs dark:border-stone-700">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void handleReaction(
                                  "like",
                                  assistantMessage,
                                  promptMessage,
                                );
                              }}
                              disabled={!isAuthenticated || isFeedbackPending}
                              aria-pressed={selectedReaction === "like"}
                              className={buttonClassName({
                                size: "sm",
                                variant: "secondary",
                                className: getReactionButtonClassName(
                                  selectedReaction === "like",
                                  "positive",
                                ),
                              })}
                            >
                              Like
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleReaction(
                                  "dislike",
                                  assistantMessage,
                                  promptMessage,
                                );
                              }}
                              disabled={!isAuthenticated || isFeedbackPending}
                              aria-pressed={selectedReaction === "dislike"}
                              className={buttonClassName({
                                size: "sm",
                                variant: "secondary",
                                className: getReactionButtonClassName(
                                  selectedReaction === "dislike",
                                  "negative",
                                ),
                              })}
                            >
                              Dislike
                            </button>
                          </div>

                          <details className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3 dark:border-stone-700 dark:bg-stone-950/30">
                            <summary className="cursor-pointer font-semibold text-stone-700 dark:text-stone-200">
                              Admin note for RAG learning
                            </summary>
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={adminDraft}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setAdminFeedbackDraftByMessage((current) => ({
                                    ...current,
                                    [m.id]: value,
                                  }));
                                }}
                                placeholder="Admin only: add written feedback tied to this prompt and response."
                                rows={3}
                                disabled={!isAuthenticated || isFeedbackPending}
                                className="w-full rounded-xl border border-stone-200 bg-white/85 px-3 py-2 text-xs text-stone-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300/35 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  void handleAdminFeedbackSubmit(
                                    assistantMessage,
                                    promptMessage,
                                  );
                                }}
                                disabled={!isAuthenticated || isFeedbackPending}
                                className={buttonClassName({
                                  size: "sm",
                                  variant: "secondary",
                                })}
                              >
                                Submit admin note
                              </button>
                            </div>
                          </details>

                          {feedbackState ? (
                            <p
                              className={getFeedbackStatusClass(
                                feedbackState.status,
                              )}
                            >
                              {feedbackState.message}
                            </p>
                          ) : null}

                          {!isAuthenticated && isReady ? (
                            <AuthGateInlinePrompt
                              className="text-xs"
                              message="Sign in to send learning feedback signals"
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {isLoading ? (
                <div className="mr-auto flex max-w-[85%] items-center gap-3">
                  <div
                    className={cx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm",
                      getMessageAvatarClassName("assistant"),
                    )}
                  >
                    <span className="font-coptic text-base leading-none">
                      Ϣ
                    </span>
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-stone-200 bg-white/90 p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900/80">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-stone-400 delay-100" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-stone-400 delay-200" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-stone-400 delay-300" />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <form
            onSubmit={handleFormSubmit}
            className="bg-white/70 p-4 dark:bg-stone-950/40 md:p-6"
          >
            <div className="mb-3 space-y-3">
              {chatAccessError ? (
                <AuthGateNotice align="left" size="compact">
                  {chatAccessError}
                </AuthGateNotice>
              ) : null}
              {error ? (
                <StatusNotice tone="error" align="left">
                  {getChatErrorMessage(error)}
                </StatusNotice>
              ) : null}
              {ocrError ? (
                <StatusNotice tone="error" align="left">
                  {ocrError}
                </StatusNotice>
              ) : null}
              {cameraError ? (
                <StatusNotice tone="info" align="left">
                  {cameraError}
                </StatusNotice>
              ) : null}
            </div>

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
              <SurfacePanel
                rounded="3xl"
                variant="subtle"
                shadow="soft"
                className="mb-3 p-4"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="mb-3 w-full rounded-2xl border border-stone-200 dark:border-stone-700"
                />
                <canvas ref={captureCanvasRef} className="hidden" />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void captureFromCamera();
                    }}
                    className={buttonClassName({ size: "sm" })}
                  >
                    Capture
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className={buttonClassName({
                      size: "sm",
                      variant: "secondary",
                    })}
                  >
                    Close Camera
                  </button>
                </div>
              </SurfacePanel>
            ) : null}

            {selectedImagePreviewUrl ? (
              <SurfacePanel
                rounded="3xl"
                variant="subtle"
                shadow="soft"
                className="mb-3 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-300">
                    Image attached (
                    {selectedImageSource === "camera" ? "camera" : "upload"})
                  </p>
                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    className={buttonClassName({
                      size: "sm",
                      variant: "link",
                    })}
                  >
                    Remove
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImagePreviewUrl}
                  alt="Selected for OCR"
                  className="max-h-48 w-auto rounded-2xl border border-stone-200 dark:border-stone-700"
                />
              </SurfacePanel>
            ) : null}

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                disabled={isLoading || ocrPending || isChatAccessBlocked}
                className={buttonClassName({
                  size: "sm",
                  variant: "secondary",
                })}
              >
                Add Image
              </button>
              <button
                type="button"
                onClick={() => {
                  void openCamera();
                }}
                disabled={
                  isLoading || ocrPending || cameraOpen || isChatAccessBlocked
                }
                className={buttonClassName({
                  size: "sm",
                  variant: "secondary",
                })}
              >
                Use Camera
              </button>
              {ocrPending ? (
                <Badge tone="accent" size="xs">
                  Running OCR...
                </Badge>
              ) : null}
            </div>

            <SurfacePanel
              rounded="3xl"
              variant="subtle"
              shadow="soft"
              className="p-2"
            >
              <div className="flex items-center gap-2">
                <input
                  id="chat-message-input"
                  name="chat_message"
                  className="min-w-0 flex-1 rounded-[1.25rem] border-0 bg-transparent px-4 py-3 font-coptic text-lg text-stone-900 outline-none ring-0 placeholder:text-stone-400 focus:outline-none focus:ring-0 dark:text-stone-100 dark:placeholder:text-stone-500 md:text-xl"
                  value={inputValue}
                  onChange={(event) => {
                    setInputValue(event.target.value);
                    if (chatAccessError) {
                      setChatAccessError(null);
                    }
                  }}
                  placeholder="Ask about a Coptic word, grammar rule, or attached image..."
                  disabled={isLoading || ocrPending || isChatAccessBlocked}
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={
                    (!inputValue.trim() && !selectedImage) ||
                    isLoading ||
                    ocrPending ||
                    isChatAccessBlocked
                  }
                  className={buttonClassName({
                    size: "sm",
                    variant: "primary",
                    className:
                      "h-10 w-10 shrink-0 rounded-xl px-0 disabled:hover:bg-sky-500 dark:disabled:hover:bg-sky-400",
                  })}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
              </div>
            </SurfacePanel>
          </form>
        </div>
      </SurfacePanel>
    </PageShell>
  );
}
