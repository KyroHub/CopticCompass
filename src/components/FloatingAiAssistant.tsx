"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { processOCRImage } from "@/actions/ocrActions";
import {
  AuthGateInlinePrompt,
  AuthGateNotice,
} from "@/components/AuthGateNotice";
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

type PageContextPayload = {
  excerpt: string;
  path: string;
  title: string;
  url: string;
};

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

  return "openrouter";
}

function getFeedbackStatusClass(status: "error" | "pending" | "success") {
  if (status === "error") {
    return "text-rose-700 dark:text-rose-300";
  }

  if (status === "pending") {
    return "text-stone-500 dark:text-stone-300";
  }

  return "text-emerald-700 dark:text-emerald-300";
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

export function FloatingAiAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inferenceProvider, setInferenceProvider] =
    useState<ChatProvider>("openrouter");
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

  const pageContext = useMemo(() => buildPageContext(pathname), [pathname]);

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
  let conversationContent: ReactNode;

  if (isChatAccessBlocked) {
    conversationContent = (
      <div className="flex h-full items-center">
        <AuthGateNotice
          align="left"
          className="w-full"
          size="comfortable"
          title="Sign in required"
        >
          Sign in to use Shenute AI on this page, ask follow-up questions, and
          send OCR-backed prompts.
        </AuthGateNotice>
      </div>
    );
  } else if (messages.length === 0) {
    conversationContent = (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white px-3 py-4 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
        Ask anything about this page, Coptic grammar, vocabulary, or
        translation.
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
      const selectedReaction = selectedReactionByMessage[message.id];
      const adminDraft = adminFeedbackDraftByMessage[message.id] ?? "";
      const isFeedbackPending = feedbackState?.status === "pending";

      return (
        <article
          key={message.id}
          className={
            message.role === "user"
              ? "ml-8 rounded-2xl rounded-tr-sm bg-sky-600 px-3 py-2 text-sm text-white"
              : "mr-8 rounded-2xl rounded-tl-sm border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          }
        >
          {Array.isArray(message.parts)
            ? message.parts.filter(isTextMessagePart).map((part, partIndex) => {
                if (message.role === "assistant") {
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
                        code: ({ className, children, ...props }) => (
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
            : null}

          {message.role === "assistant" ? (
            <div className="mt-2 space-y-2 border-t border-stone-200 pt-2 text-[11px] dark:border-stone-700">
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
                  className={`rounded border px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                    selectedReaction === "like"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
                  }`}
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
                  className={`rounded border px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                    selectedReaction === "dislike"
                      ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                      : "border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
                  }`}
                >
                  Dislike
                </button>
              </div>

              <details className="rounded border border-stone-200 p-2 dark:border-stone-700">
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
                        [message.id]: value,
                      }));
                    }}
                    placeholder="Admin only: add written feedback tied to this prompt/response."
                    rows={3}
                    disabled={!isAuthenticated || isFeedbackPending}
                    className="w-full rounded border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
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
                    className="rounded bg-stone-900 px-2 py-1 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900"
                  >
                    Submit admin note
                  </button>
                </div>
              </details>

              {feedbackState ? (
                <p className={getFeedbackStatusClass(feedbackState.status)}>
                  {feedbackState.message}
                </p>
              ) : null}

              {!isAuthenticated && isReady ? (
                <AuthGateInlinePrompt
                  className="text-[11px]"
                  message="Sign in to send learning feedback signals"
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isChatAccessBlocked) {
      return;
    }

    const trimmed = inputValue.trim();
    if ((!trimmed && !selectedImage) || isLoading || ocrPending) {
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
    clearSelectedImage();
  }

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
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <section className="flex h-[540px] w-[min(94vw,380px)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900">
          <header className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-800/60">
            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                Shenute AI
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Context-aware on this page
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              Close
            </button>
          </header>

          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-2 dark:border-stone-700">
            <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
              {pageContext.path || "/"}
            </p>
            <label className="text-[11px] text-stone-500 dark:text-stone-400">
              <span className="mr-1">Provider</span>
              <select
                className="compact-select-base min-h-0 rounded-md border-stone-300 bg-white py-0.5 text-[11px] dark:border-stone-600 dark:bg-stone-800"
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

          <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50/60 p-3 dark:bg-stone-950/40">
            {conversationContent}

            {isLoading ? (
              <div className="mr-8 rounded-2xl rounded-tl-sm border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
                Thinking...
              </div>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900"
          >
            {error ? (
              <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {error.message || "Request failed."}
              </p>
            ) : null}
            {ocrError ? (
              <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {ocrError}
              </p>
            ) : null}
            {cameraError ? (
              <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
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
              <div className="mb-2 rounded-lg border border-stone-200 bg-stone-50 p-2 dark:border-stone-700 dark:bg-stone-800/60">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="mb-2 w-full rounded border border-stone-200 dark:border-stone-700"
                />
                <canvas ref={captureCanvasRef} className="hidden" />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void captureFromCamera();
                    }}
                    className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                  >
                    Capture
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-700 dark:border-stone-600 dark:text-stone-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}

            {selectedImagePreviewUrl ? (
              <div className="mb-2 rounded-lg border border-stone-200 bg-stone-50 p-2 dark:border-stone-700 dark:bg-stone-800/60">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] text-stone-600 dark:text-stone-300">
                    Image attached (
                    {selectedImageSource === "camera" ? "camera" : "upload"})
                  </p>
                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImagePreviewUrl}
                  alt="Selected for OCR"
                  className="max-h-28 w-auto rounded border border-stone-200 dark:border-stone-700"
                />
              </div>
            ) : null}

            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                disabled={isLoading || ocrPending || isChatAccessBlocked}
                className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
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
                className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
              >
                Camera
              </button>
              {ocrPending ? (
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  OCR...
                </p>
              ) : null}
            </div>

            <div className="flex gap-2">
              <input
                value={inputValue}
                onChange={(event) => {
                  setInputValue(event.target.value);
                }}
                placeholder="Ask about this page or attached image..."
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-sky-500 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                disabled={isLoading || ocrPending || isChatAccessBlocked}
              />
              <button
                type="submit"
                disabled={
                  (!inputValue.trim() && !selectedImage) ||
                  isLoading ||
                  ocrPending ||
                  isChatAccessBlocked
                }
                className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
          }}
          className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-xl transition-colors hover:bg-sky-700"
        >
          Chat with Shenute AI
        </button>
      ) : null}
    </div>
  );
}
