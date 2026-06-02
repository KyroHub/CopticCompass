import { cx } from "@/lib/classes";

import {
  SHENUTE_ADAPTIVE_DIALOG_CLASS,
  SHENUTE_DIALOG_BACKDROP_CLASS,
  ShenuteActionButton,
  ShenuteSurfaceHeader,
} from "./ShenuteClientPrimitives";

import type { RefObject } from "react";

type ShenuteCopyFallbackDialogCopy = {
  closeMenu: string;
  copyResponseManual: string;
  copyResponseManualHint: string;
  selectCopyText: string;
};

type ShenuteCopyFallbackDialogProps = {
  copy: ShenuteCopyFallbackDialogCopy;
  fallbackText: string;
  onClose: () => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function ShenuteCopyFallbackDialog({
  copy,
  fallbackText,
  onClose,
  textareaRef,
}: ShenuteCopyFallbackDialogProps) {
  return (
    <>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className={cx(SHENUTE_DIALOG_BACKDROP_CLASS, "z-[80]")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="shenute-copy-fallback-title"
        className={cx(
          SHENUTE_ADAPTIVE_DIALOG_CLASS,
          "z-[90] sm:w-[min(32rem,calc(100vw_-_2rem))] sm:p-4",
        )}
      >
        <ShenuteSurfaceHeader
          closeLabel={copy.closeMenu}
          onClose={onClose}
          titleId="shenute-copy-fallback-title"
        >
          {copy.copyResponseManual}
        </ShenuteSurfaceHeader>
        <p className="mt-2 text-xs leading-5 text-muted">
          {copy.copyResponseManualHint}
        </p>
        <textarea
          ref={textareaRef}
          readOnly
          value={fallbackText}
          rows={8}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-3 max-h-[45dvh] min-h-36 w-full resize-none rounded-lg border border-line bg-elevated px-3 py-2 font-coptic text-sm leading-6 text-ink shadow-inner outline-none focus:border-coptic/55 focus:ring-2 focus:ring-coptic/25"
        />
        <ShenuteActionButton
          actionClassName="h-10 justify-center"
          onClick={() => {
            textareaRef.current?.focus();
            textareaRef.current?.select();
          }}
          className="mt-3"
        >
          {copy.selectCopyText}
        </ShenuteActionButton>
      </div>
    </>
  );
}
