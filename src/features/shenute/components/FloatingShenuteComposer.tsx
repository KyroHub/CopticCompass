import {
  Camera,
  ImagePlus,
  LoaderCircle,
  ScanText,
  SendHorizontal,
  Square,
  X,
} from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { cx } from "@/lib/classes";

import type { ShenuteImageAttachmentSource } from "./useShenuteImageAttachment";
import type {
  FormEvent,
  KeyboardEvent,
  RefObject,
  SyntheticEvent,
} from "react";

type FloatingShenuteComposerCopy = {
  addImage: string;
  camera: string;
  capture: string;
  close: string;
  imageAttached: string;
  imageFromCamera: string;
  imageFromUpload: string;
  ocrPending: string;
  removeImage: string;
  requestFailed: string;
  selectedForOcrAlt: string;
  stopResponse: string;
};

type FloatingShenuteComposerProps = {
  attachmentMenuDetailsRef: RefObject<HTMLDetailsElement | null>;
  cameraError: string | null;
  cameraOpen: boolean;
  canSubmitPrompt: boolean;
  captureCanvasRef: RefObject<HTMLCanvasElement | null>;
  composerPlaceholder: string;
  composerStateLabel: string | null;
  composerStateMeta: string | null;
  composerSubmitLabel: string;
  copy: FloatingShenuteComposerCopy;
  error: unknown;
  fileInputRef: RefObject<HTMLInputElement | null>;
  inputValue: string;
  isAttachmentMenuDisabled: boolean;
  isComposerDisabled: boolean;
  isLoading: boolean;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  ocrError: string | null;
  ocrPending: boolean;
  onCaptureFromCamera: () => void;
  onClearSelectedImage: () => void;
  onCloseAttachmentMenu: () => void;
  onInputChange: (value: string) => void;
  onOpenCamera: () => void;
  onPromptKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onStopCamera: () => void;
  onStopResponse: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleAttachmentMenu: (event: SyntheticEvent<HTMLDetailsElement>) => void;
  selectedImage: File | null;
  selectedImagePreviewUrl: string | null;
  selectedImageSource: ShenuteImageAttachmentSource | null;
  setImageAttachment: (
    file: File,
    source: ShenuteImageAttachmentSource,
  ) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function FloatingShenuteComposer({
  attachmentMenuDetailsRef,
  cameraError,
  cameraOpen,
  canSubmitPrompt,
  captureCanvasRef,
  composerPlaceholder,
  composerStateLabel,
  composerStateMeta,
  composerSubmitLabel,
  copy,
  error,
  fileInputRef,
  inputValue,
  isAttachmentMenuDisabled,
  isComposerDisabled,
  isLoading,
  messageInputRef,
  ocrError,
  ocrPending,
  onCaptureFromCamera,
  onClearSelectedImage,
  onCloseAttachmentMenu,
  onInputChange,
  onOpenCamera,
  onPromptKeyDown,
  onStopCamera,
  onStopResponse,
  onSubmit,
  onToggleAttachmentMenu,
  selectedImage,
  selectedImagePreviewUrl,
  selectedImageSource,
  setImageAttachment,
  videoRef,
}: FloatingShenuteComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-line/80 bg-surface/90 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      {error ? (
        <p className="mb-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs text-danger dark:bg-danger/10">
          {copy.requestFailed}
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
              onClick={onCaptureFromCamera}
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
              onClick={onStopCamera}
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
              onClick={onClearSelectedImage}
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
          onToggle={onToggleAttachmentMenu}
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
              isAttachmentMenuDisabled && "pointer-events-none opacity-55",
            )}
          >
            <ImagePlus className="h-4 w-4" />
          </summary>
          <div className="absolute bottom-full left-0 z-30 mb-2 w-52 rounded-lg border border-line/80 bg-surface p-2 shadow-panel">
            <button
              type="button"
              onClick={() => {
                onCloseAttachmentMenu();
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
                onCloseAttachmentMenu();
                onOpenCamera();
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
            onInputChange(event.target.value);
          }}
          onKeyDown={onPromptKeyDown}
          placeholder={composerPlaceholder}
          className="max-h-28 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border-0 bg-transparent px-2 py-2 text-sm leading-6 text-ink outline-none placeholder:text-muted/70 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-muted/75 sm:max-h-[136px]"
          disabled={isComposerDisabled}
        />
        {isLoading ? (
          <button
            type="button"
            aria-label={copy.stopResponse}
            title={copy.stopResponse}
            onClick={onStopResponse}
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
  );
}
