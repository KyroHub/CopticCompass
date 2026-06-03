import {
  Camera,
  LoaderCircle,
  SendHorizontal,
  Square,
  XCircle,
} from "lucide-react";

import { AuthGateNotice } from "@/components/AuthGateNotice";
import { buttonClassName } from "@/components/Button";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";

import {
  ShenuteAttachmentMenu,
  ShenuteAttachmentPreview,
} from "./ShenuteAttachmentPanel";
import {
  SHENUTE_ICON_CLASS,
  ShenuteActionButton,
  ShenuteSurfaceHeader,
} from "./ShenuteClientPrimitives";

import type { ShenuteCopy } from "./shenuteCopy";
import type { ShenuteImageAttachmentSource } from "./useShenuteImageAttachment";
import type {
  FormEvent,
  KeyboardEvent,
  RefObject,
  SyntheticEvent,
} from "react";

type ShenuteComposerProps = {
  attachmentMenuDetailsRef: RefObject<HTMLDetailsElement | null>;
  cameraError: string | null;
  cameraOpen: boolean;
  canSubmitPrompt: boolean;
  captureCanvasRef: RefObject<HTMLCanvasElement | null>;
  composerPlaceholder: string;
  composerStateLabel: string | null;
  composerStateMeta: string | null;
  composerSubmitLabel: string;
  copy: ShenuteCopy;
  fileInputRef: RefObject<HTMLInputElement | null>;
  inputValue: string;
  isAttachmentMenuDisabled: boolean;
  isComposerBusy: boolean;
  isComposerDisabled: boolean;
  isLoading: boolean;
  isShenuteAccessBlocked: boolean;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  ocrError: string | null;
  ocrPending: boolean;
  onCaptureFromCamera: () => void;
  onClearSelectedImage: () => void;
  onInputChange: (value: string) => void;
  onMessageInputFocus: () => void;
  onOpenCamera: () => void;
  onPromptKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onStopCamera: () => void;
  onStopResponse: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleAttachmentMenu: (event: SyntheticEvent<HTMLDetailsElement>) => void;
  requestErrorMessage: string | null;
  selectedImage: File | null;
  selectedImagePreviewUrl: string | null;
  selectedImageSizeLabel: string | null;
  selectedImageSource: ShenuteImageAttachmentSource | null;
  setImageAttachment: (
    file: File,
    source: ShenuteImageAttachmentSource,
  ) => void;
  shenuteAccessError: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function ShenuteComposer({
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
  fileInputRef,
  inputValue,
  isAttachmentMenuDisabled,
  isComposerBusy,
  isComposerDisabled,
  isLoading,
  isShenuteAccessBlocked,
  messageInputRef,
  ocrError,
  ocrPending,
  onCaptureFromCamera,
  onClearSelectedImage,
  onInputChange,
  onMessageInputFocus,
  onOpenCamera,
  onPromptKeyDown,
  onStopCamera,
  onStopResponse,
  onSubmit,
  onToggleAttachmentMenu,
  requestErrorMessage,
  selectedImage,
  selectedImagePreviewUrl,
  selectedImageSizeLabel,
  selectedImageSource,
  setImageAttachment,
  shenuteAccessError,
  videoRef,
}: ShenuteComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      aria-busy={isComposerBusy}
      className="sticky bottom-0 z-20 border-t border-line bg-surface/90 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-18px_30px_rgba(30,29,29,0.08)] backdrop-blur-xl dark:shadow-[0_-18px_30px_rgba(0,0,0,0.35)] sm:p-3 sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:p-4 md:pb-4"
    >
      {shenuteAccessError || requestErrorMessage || ocrError || cameraError ? (
        <div className="mb-3 space-y-3">
          {shenuteAccessError ? (
            <AuthGateNotice align="left" size="compact">
              {shenuteAccessError}
            </AuthGateNotice>
          ) : null}
          {requestErrorMessage ? (
            <StatusNotice tone="error" align="left">
              {requestErrorMessage}
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
        <SurfacePanel
          rounded="lg"
          variant="subtle"
          shadow="soft"
          className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 max-h-[min(30rem,calc(100dvh-8rem))] overflow-y-auto p-3 sm:static sm:mb-3 sm:max-h-none sm:p-4"
        >
          <ShenuteSurfaceHeader
            closeLabel={copy.cameraClose}
            className="mb-2"
            onClose={onStopCamera}
          >
            {copy.cameraPreview}
          </ShenuteSurfaceHeader>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="mb-3 aspect-[4/3] max-h-[45dvh] w-full rounded-lg border border-line bg-ink object-contain sm:max-h-none"
          />
          <canvas ref={captureCanvasRef} className="hidden" />
          <div className="mt-3 grid gap-2 sm:flex sm:justify-end">
            <ShenuteActionButton
              actionClassName="h-10 justify-center gap-2 sm:h-9"
              buttonVariant="primary"
              fullWidth={false}
              onClick={onCaptureFromCamera}
              icon={<Camera className={SHENUTE_ICON_CLASS.action} />}
            >
              {copy.cameraCapture}
            </ShenuteActionButton>
            <ShenuteActionButton
              actionClassName="h-10 justify-center gap-2 sm:h-9"
              fullWidth={false}
              onClick={onStopCamera}
              icon={<XCircle className={SHENUTE_ICON_CLASS.action} />}
            >
              {copy.cameraClose}
            </ShenuteActionButton>
          </div>
        </SurfacePanel>
      ) : null}

      <SurfacePanel
        rounded="lg"
        variant="subtle"
        shadow="soft"
        className={cx(
          "p-1.5 transition focus-within:ring-2 focus-within:ring-coptic/25 sm:p-2",
          isLoading && "ring-1 ring-coptic/25",
          ocrPending && "ring-1 ring-accent/30",
          isShenuteAccessBlocked && "opacity-80",
        )}
      >
        <ShenuteAttachmentPreview
          copy={copy}
          onClearSelectedImage={onClearSelectedImage}
          ocrPending={ocrPending}
          selectedImage={selectedImage}
          selectedImagePreviewUrl={selectedImagePreviewUrl}
          selectedImageSizeLabel={selectedImageSizeLabel}
          selectedImageSource={selectedImageSource}
        />
        <div className="flex items-end gap-2">
          <ShenuteAttachmentMenu
            attachmentMenuDetailsRef={attachmentMenuDetailsRef}
            cameraOpen={cameraOpen}
            copy={copy}
            fileInputRef={fileInputRef}
            isAttachmentMenuDisabled={isAttachmentMenuDisabled}
            onOpenCamera={onOpenCamera}
            onToggleAttachmentMenu={onToggleAttachmentMenu}
          />
          <textarea
            ref={messageInputRef}
            id="shenute-message-input"
            name="shenute_message"
            rows={1}
            enterKeyHint="send"
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border-0 bg-transparent px-2.5 py-2.5 font-coptic text-base leading-6 text-ink outline-none ring-0 placeholder:text-muted/65 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-muted/75 sm:max-h-40 sm:min-h-12 sm:px-4 sm:py-3 sm:text-lg md:text-xl"
            aria-label={copy.placeholder}
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            onFocus={onMessageInputFocus}
            onKeyDown={onPromptKeyDown}
            placeholder={composerPlaceholder}
            disabled={isComposerDisabled}
          />
          {isLoading ? (
            <button
              type="button"
              aria-label={copy.cancelResponse}
              title={copy.cancelResponse}
              onClick={onStopResponse}
              className={buttonClassName({
                size: "sm",
                variant: "secondary",
                className:
                  "h-11 w-11 shrink-0 rounded-lg border-coptic/45 bg-coptic-soft px-0 text-coptic hover:bg-coptic-soft sm:h-12 sm:w-12",
              })}
            >
              <Square
                className={cx(SHENUTE_ICON_CLASS.primary, "fill-current")}
              />
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
                className: "h-11 w-11 shrink-0 rounded-lg px-0 sm:h-12 sm:w-12",
              })}
            >
              {ocrPending ? (
                <LoaderCircle
                  className={cx(SHENUTE_ICON_CLASS.primary, "animate-spin")}
                />
              ) : (
                <SendHorizontal className={SHENUTE_ICON_CLASS.primary} />
              )}
            </button>
          )}
        </div>
        {composerStateLabel ? (
          <div
            aria-live="polite"
            className="mt-1.5 flex min-w-0 items-center gap-2 rounded-lg bg-surface/65 px-2.5 py-1.5 text-xs text-muted sm:mt-2 sm:px-3"
          >
            <LoaderCircle
              aria-hidden="true"
              className={cx(
                SHENUTE_ICON_CLASS.meta,
                "shrink-0 animate-spin text-accent-strong dark:text-accent",
              )}
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
      </SurfacePanel>
    </form>
  );
}
