import { Camera, ImagePlus, XCircle } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { cx } from "@/lib/classes";

import {
  SHENUTE_ICON_CLASS,
  ShenuteActionButton,
  ShenuteSurfaceHeader,
} from "./ShenuteClientPrimitives";
import { closeContainingDetails } from "./shenuteClientUtils";

import type { ShenuteCopy } from "./shenuteCopy";
import type { ShenuteImageAttachmentSource } from "./useShenuteImageAttachment";
import type { RefObject, SyntheticEvent } from "react";

type ShenuteAttachmentPanelProps = {
  attachmentMenuDetailsRef: RefObject<HTMLDetailsElement | null>;
  cameraOpen: boolean;
  copy: ShenuteCopy;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isAttachmentMenuDisabled: boolean;
  onClearSelectedImage: () => void;
  onOpenCamera: () => void;
  onToggleAttachmentMenu: (event: SyntheticEvent<HTMLDetailsElement>) => void;
  ocrPending: boolean;
  selectedImage: File | null;
  selectedImagePreviewUrl: string | null;
  selectedImageSizeLabel: string | null;
  selectedImageSource: ShenuteImageAttachmentSource | null;
};

type ShenuteAttachmentPreviewProps = Pick<
  ShenuteAttachmentPanelProps,
  | "copy"
  | "ocrPending"
  | "onClearSelectedImage"
  | "selectedImage"
  | "selectedImagePreviewUrl"
  | "selectedImageSizeLabel"
  | "selectedImageSource"
>;

type ShenuteAttachmentMenuProps = Pick<
  ShenuteAttachmentPanelProps,
  | "attachmentMenuDetailsRef"
  | "cameraOpen"
  | "copy"
  | "fileInputRef"
  | "isAttachmentMenuDisabled"
  | "onOpenCamera"
  | "onToggleAttachmentMenu"
>;

export function ShenuteAttachmentPreview({
  copy,
  onClearSelectedImage,
  ocrPending,
  selectedImage,
  selectedImagePreviewUrl,
  selectedImageSizeLabel,
  selectedImageSource,
}: ShenuteAttachmentPreviewProps) {
  if (!selectedImagePreviewUrl) {
    return null;
  }

  return (
    <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-line bg-surface/85 p-1.5 shadow-sm sm:mb-2 sm:gap-3 sm:p-2">
      <Image
        unoptimized
        src={selectedImagePreviewUrl}
        alt={copy.selectedImageAlt}
        width={72}
        height={72}
        className="h-12 w-12 shrink-0 rounded-lg border border-line bg-elevated object-contain sm:h-14 sm:w-14"
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink">
            {copy.attachmentReady}
          </span>
          <Badge tone="accent" size="xs">
            {selectedImageSource === "camera"
              ? copy.cameraSource
              : copy.uploadSource}
          </Badge>
          {ocrPending ? (
            <Badge tone="neutral" size="xs">
              {copy.runningOcr}
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted">
          {selectedImage?.name ?? copy.imageAttached}
        </p>
        {selectedImageSizeLabel ? (
          <p className="text-xs text-muted">{selectedImageSizeLabel}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={copy.remove}
        title={copy.remove}
        onClick={onClearSelectedImage}
        className={buttonClassName({
          size: "sm",
          variant: "secondary",
          className:
            "h-9 w-9 shrink-0 border-danger/25 px-0 text-danger hover:bg-danger/5 dark:hover:bg-danger/10 sm:h-10 sm:w-10",
        })}
      >
        <XCircle className={SHENUTE_ICON_CLASS.action} />
      </button>
    </div>
  );
}

export function ShenuteAttachmentMenu({
  attachmentMenuDetailsRef,
  cameraOpen,
  copy,
  fileInputRef,
  isAttachmentMenuDisabled,
  onOpenCamera,
  onToggleAttachmentMenu,
}: ShenuteAttachmentMenuProps) {
  return (
    <details
      ref={attachmentMenuDetailsRef}
      className="group relative shrink-0 self-end"
      onToggle={onToggleAttachmentMenu}
    >
      <summary
        aria-disabled={isAttachmentMenuDisabled}
        aria-label={`${copy.addImage} / ${copy.useCamera}`}
        title={`${copy.addImage} / ${copy.useCamera}`}
        className={cx(
          buttonClassName({
            size: "sm",
            variant: "secondary",
            className:
              "h-11 w-11 cursor-pointer list-none rounded-lg px-0 sm:h-12 sm:w-12 [&::-webkit-details-marker]:hidden",
          }),
          isAttachmentMenuDisabled && "pointer-events-none opacity-55",
        )}
      >
        <ImagePlus className={SHENUTE_ICON_CLASS.panel} />
      </summary>
      <div className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[70] hidden w-auto rounded-lg border border-line bg-surface p-3 shadow-panel group-open:block sm:absolute sm:inset-x-auto sm:bottom-full sm:left-0 sm:mb-2 sm:w-52 sm:p-2">
        <ShenuteSurfaceHeader
          closeLabel={copy.closeMenu}
          className="mb-2 sm:hidden"
          onClose={(event) => closeContainingDetails(event.currentTarget)}
        >
          {copy.addImage}
        </ShenuteSurfaceHeader>
        <ShenuteActionButton
          onClick={(event) => {
            closeContainingDetails(event.currentTarget);
            fileInputRef.current?.click();
          }}
          disabled={isAttachmentMenuDisabled}
          icon={<ImagePlus className={SHENUTE_ICON_CLASS.action} />}
        >
          {copy.addImage}
        </ShenuteActionButton>
        <ShenuteActionButton
          onClick={(event) => {
            closeContainingDetails(event.currentTarget);
            onOpenCamera();
          }}
          disabled={isAttachmentMenuDisabled || cameraOpen}
          className="mt-2"
          icon={<Camera className={SHENUTE_ICON_CLASS.action} />}
        >
          {copy.useCamera}
        </ShenuteActionButton>
      </div>
    </details>
  );
}
