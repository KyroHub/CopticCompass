"use client";

import { Copy, Link2, Share2 } from "lucide-react";
import { FaFacebookF, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";

import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";

import type { EntryActionNotice } from "../lib/entryActionBar";
import type {
  buildEntryShareLinks,
  EntrySharePayload,
} from "../lib/entryShare";

type EntrySharePanelProps = {
  canUseNativeShare: boolean;
  notice: EntryActionNotice;
  onCopyLink: () => void;
  onCopyText: () => void;
  onNativeShare: () => void;
  shareLinks: ReturnType<typeof buildEntryShareLinks>;
  sharePayload: EntrySharePayload;
};

export function EntrySharePanel({
  canUseNativeShare,
  notice,
  onCopyLink,
  onCopyText,
  onNativeShare,
  shareLinks,
  sharePayload,
}: EntrySharePanelProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-lg border border-accent/25 bg-accent-soft/60 p-5 shadow-soft backdrop-blur-md">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Share2 className="h-4 w-4 text-accent-strong dark:text-accent" />
          {t("entry.actions.shareTitle")}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {t("entry.actions.shareDescription")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <SurfacePanel shadow="soft" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-strong dark:text-accent">
            {t("entry.actions.sharePreviewLabel")}
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">
            {sharePayload.text}
          </p>
        </SurfacePanel>

        <div className="grid gap-3 sm:grid-cols-2">
          {canUseNativeShare ? (
            <button
              type="button"
              className={buttonClassName({
                className: "justify-center gap-2 px-4",
                variant: "secondary",
              })}
              onClick={onNativeShare}
            >
              <Share2 className="h-4 w-4" />
              {t("entry.actions.shareNative")}
            </button>
          ) : null}

          <button
            type="button"
            className={buttonClassName({
              className: "justify-center gap-2 px-4",
              variant: "secondary",
            })}
            onClick={onCopyText}
          >
            <Copy className="h-4 w-4" />
            {t("entry.actions.shareCopyText")}
          </button>

          <button
            type="button"
            className={buttonClassName({
              className: "justify-center gap-2 px-4",
              variant: "secondary",
            })}
            onClick={onCopyLink}
          >
            <Link2 className="h-4 w-4" />
            {t("entry.actions.shareCopyLink")}
          </button>

          <a
            href={shareLinks.x}
            target="_blank"
            rel="noreferrer"
            className={buttonClassName({
              className: "justify-center gap-2 px-4",
              variant: "secondary",
            })}
          >
            <FaXTwitter className="h-4 w-4" />
            {t("entry.actions.sharePlatformX")}
          </a>

          <a
            href={shareLinks.facebook}
            target="_blank"
            rel="noreferrer"
            className={buttonClassName({
              className: "justify-center gap-2 px-4",
              variant: "secondary",
            })}
          >
            <FaFacebookF className="h-4 w-4" />
            {t("entry.actions.sharePlatformFacebook")}
          </a>

          <a
            href={shareLinks.linkedin}
            target="_blank"
            rel="noreferrer"
            className={buttonClassName({
              className: "justify-center gap-2 px-4",
              variant: "secondary",
            })}
          >
            <FaLinkedinIn className="h-4 w-4" />
            {t("entry.actions.sharePlatformLinkedIn")}
          </a>
        </div>
      </div>

      {notice ? (
        <div className="mt-4">
          <StatusNotice tone={notice.tone} align="left">
            {notice.message}
          </StatusNotice>
        </div>
      ) : null}
    </div>
  );
}
