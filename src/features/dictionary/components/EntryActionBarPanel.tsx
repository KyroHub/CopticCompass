"use client";

import { Heart, Flag, Loader2, Share2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { AuthGatedActionButton } from "@/components/AuthGatedActionButton";
import { buttonClassName, iconButtonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import type { LexicalEntry } from "@/features/dictionary/types";
import { cx } from "@/lib/classes";
import { useOptionalAuthGate } from "@/lib/supabase/useOptionalAuthGate";

import { EntryReportPanel } from "./EntryReportPanel";
import { EntrySharePanel } from "./EntrySharePanel";
import { ENTRY_FAVORITE_ERROR_LABEL_KEYS } from "../lib/entryActionBar";
import { useEntryActionBarState } from "../lib/useEntryActionBarState";
import { useEntryFavorite } from "../lib/useEntryFavorite";
import { useEntryShareActions } from "../lib/useEntryShareActions";

type EntryActionBarProps = {
  compact?: boolean;
  entry: LexicalEntry;
  initialIntent?: "favorite" | "report" | "share";
};

const compactActionButtonClassName = iconButtonClassName({
  className: "h-8 w-8 bg-elevated",
});

export function EntryActionBarPanel({
  compact = false,
  entry,
  initialIntent,
}: EntryActionBarProps) {
  const { language, t } = useLanguage();
  const authGate = useOptionalAuthGate();
  const {
    activeLockedAction,
    closeReportPanel,
    handleFavoriteClick,
    handleLockedActionOpenChange,
    handleReportSubmitted,
    isReportOpen,
    isShareOpen,
    reportNotice,
    setShareNotice,
    shareNotice,
    toggleReportPanel,
    toggleSharePanel,
  } = useEntryActionBarState();
  const {
    errorCode,
    isFavorited,
    isLoading,
    isPending,
    pendingAction,
    toggleFavorite,
  } = useEntryFavorite(entry.id, authGate.user?.id ?? null);
  const {
    canUseNativeShare,
    copyLink,
    copyText,
    nativeShare,
    shareLinks,
    sharePayload,
  } = useEntryShareActions({
    entry,
    language,
    onNoticeChange: setShareNotice,
  });
  const initialIntentAppliedRef = useRef(false);

  const lockedMessage = authGate.authAvailable
    ? t("entry.actions.loginPrompt")
    : t("entry.actions.authUnavailable");
  const favoriteErrorMessage = errorCode
    ? t(ENTRY_FAVORITE_ERROR_LABEL_KEYS[errorCode])
    : null;
  const isReportPanelVisible = authGate.isAuthenticated && isReportOpen;
  const sharePanelId = `entry-share-panel-${entry.id}`;
  let favoriteLabel = t("entry.actions.favorite");

  if (isLoading) {
    favoriteLabel = t("entry.actions.favoriteLoading");
  } else if (isPending) {
    favoriteLabel =
      pendingAction === "remove"
        ? t("entry.actions.favoriteRemoving")
        : t("entry.actions.favoriteSaving");
  } else if (isFavorited) {
    favoriteLabel = t("entry.actions.favorited");
  }

  useEffect(() => {
    if (!initialIntent || initialIntentAppliedRef.current) {
      return;
    }

    initialIntentAppliedRef.current = true;

    if (initialIntent === "share") {
      toggleSharePanel();
      return;
    }

    if (initialIntent === "report") {
      if (authGate.isReady && authGate.isAuthenticated) {
        toggleReportPanel();
      } else {
        handleLockedActionOpenChange("report", true);
      }
      return;
    }

    if (!authGate.isAuthenticated) {
      handleLockedActionOpenChange("favorite", true);
    }
  }, [
    authGate.isAuthenticated,
    authGate.isReady,
    handleLockedActionOpenChange,
    initialIntent,
    toggleReportPanel,
    toggleSharePanel,
  ]);

  if (compact) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-controls={sharePanelId}
            aria-expanded={isShareOpen}
            aria-label={
              isShareOpen
                ? t("entry.actions.shareClose")
                : t("entry.actions.share")
            }
            title={
              isShareOpen
                ? t("entry.actions.shareClose")
                : t("entry.actions.share")
            }
            className={cx(
              compactActionButtonClassName,
              isShareOpen &&
                "border-accent/30 bg-accent-soft text-accent-strong hover:bg-accent-soft hover:text-ink dark:text-accent",
            )}
            onClick={toggleSharePanel}
          >
            <Share2 className="h-4 w-4" />
            <span className="sr-only">
              {isShareOpen
                ? t("entry.actions.shareClose")
                : t("entry.actions.share")}
            </span>
          </button>

          <AuthGatedActionButton
            className={cx(
              compactActionButtonClassName,
              (isLoading || isPending) && "opacity-70",
              isFavorited &&
                "border-danger/20 bg-danger/5 text-danger hover:bg-danger/10",
            )}
            disabled={isLoading || isPending}
            isAuthenticated={authGate.isAuthenticated}
            isReady={authGate.isReady}
            lockedContent={
              <>
                <Heart className="h-4 w-4" />
                <span className="sr-only">{favoriteLabel}</span>
              </>
            }
            lockedOpen={activeLockedAction === "favorite"}
            lockedMessage={lockedMessage}
            onLockedOpenChange={(visible) =>
              handleLockedActionOpenChange("favorite", visible)
            }
            onClick={() => {
              handleFavoriteClick();
              void toggleFavorite();
            }}
            title={favoriteLabel}
            aria-label={favoriteLabel}
          >
            {isLoading || isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={cx("h-4 w-4", isFavorited && "fill-current")} />
            )}
            <span className="sr-only">{favoriteLabel}</span>
          </AuthGatedActionButton>

          <AuthGatedActionButton
            className={cx(
              compactActionButtonClassName,
              isReportOpen &&
                "border-warning/25 bg-warning/5 text-warning hover:bg-warning/10",
            )}
            isAuthenticated={authGate.isAuthenticated}
            isReady={authGate.isReady}
            lockedContent={
              <>
                <Flag className="h-4 w-4" />
                <span className="sr-only">
                  {isReportPanelVisible
                    ? t("entry.actions.reportClose")
                    : t("entry.actions.report")}
                </span>
              </>
            }
            lockedOpen={activeLockedAction === "report"}
            lockedMessage={lockedMessage}
            onLockedOpenChange={(visible) =>
              handleLockedActionOpenChange("report", visible)
            }
            onClick={toggleReportPanel}
            title={
              isReportPanelVisible
                ? t("entry.actions.reportClose")
                : t("entry.actions.report")
            }
            aria-label={
              isReportPanelVisible
                ? t("entry.actions.reportClose")
                : t("entry.actions.report")
            }
          >
            <Flag className="h-4 w-4" />
            <span className="sr-only">
              {isReportPanelVisible
                ? t("entry.actions.reportClose")
                : t("entry.actions.report")}
            </span>
          </AuthGatedActionButton>
        </div>

        {favoriteErrorMessage ? (
          <div className="w-full sm:w-[min(28rem,calc(100vw-6rem))]">
            <StatusNotice tone="error" align="left">
              {favoriteErrorMessage}
            </StatusNotice>
          </div>
        ) : null}

        {reportNotice ? (
          <div className="w-full sm:w-[min(28rem,calc(100vw-6rem))]">
            <StatusNotice tone={reportNotice.tone} align="left">
              {reportNotice.message}
            </StatusNotice>
          </div>
        ) : null}

        {isShareOpen ? (
          <div
            id={sharePanelId}
            className="w-full sm:w-[min(42rem,calc(100vw-6rem))]"
          >
            <EntrySharePanel
              canUseNativeShare={canUseNativeShare}
              notice={shareNotice}
              onCopyLink={() => void copyLink()}
              onCopyText={() => void copyText()}
              onNativeShare={() => void nativeShare()}
              shareLinks={shareLinks}
              sharePayload={sharePayload}
            />
          </div>
        ) : null}

        {isReportPanelVisible ? (
          <div className="w-full sm:w-[min(42rem,calc(100vw-6rem))]">
            <EntryReportPanel
              entry={entry}
              language={language}
              onClose={closeReportPanel}
              onSubmitted={handleReportSubmitted}
            />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-strong dark:text-accent">
            {t("entry.actions.eyebrow")}
          </p>
          <p className="text-sm leading-6 text-muted">
            {t("entry.actions.description")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            aria-controls={sharePanelId}
            aria-expanded={isShareOpen}
            className={cx(
              buttonClassName({
                className: "gap-2 px-4",
                variant: "secondary",
              }),
              isShareOpen &&
                "border-accent/30 bg-accent-soft text-accent-strong hover:bg-accent-soft hover:text-ink dark:text-accent",
            )}
            onClick={toggleSharePanel}
          >
            <Share2 className="h-4 w-4" />
            {isShareOpen
              ? t("entry.actions.shareClose")
              : t("entry.actions.share")}
          </button>

          <AuthGatedActionButton
            className={cx(
              buttonClassName({
                className: "gap-2 px-4",
                variant: "secondary",
              }),
              (isLoading || isPending) && "opacity-70",
              isFavorited &&
                "border-danger/20 bg-danger/5 text-danger hover:bg-danger/10",
            )}
            disabled={isLoading || isPending}
            isAuthenticated={authGate.isAuthenticated}
            isReady={authGate.isReady}
            lockedOpen={activeLockedAction === "favorite"}
            lockedMessage={lockedMessage}
            onLockedOpenChange={(visible) =>
              handleLockedActionOpenChange("favorite", visible)
            }
            onClick={() => {
              handleFavoriteClick();
              void toggleFavorite();
            }}
          >
            {isLoading || isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={cx("h-4 w-4", isFavorited && "fill-current")} />
            )}
            {favoriteLabel}
          </AuthGatedActionButton>

          <AuthGatedActionButton
            className={cx(
              buttonClassName({
                className: "gap-2 px-4",
                variant: "secondary",
              }),
              isReportOpen &&
                "border-warning/25 bg-warning/5 text-warning hover:bg-warning/10",
            )}
            isAuthenticated={authGate.isAuthenticated}
            isReady={authGate.isReady}
            lockedOpen={activeLockedAction === "report"}
            lockedMessage={lockedMessage}
            onLockedOpenChange={(visible) =>
              handleLockedActionOpenChange("report", visible)
            }
            onClick={toggleReportPanel}
          >
            <Flag className="h-4 w-4" />
            {isReportPanelVisible
              ? t("entry.actions.reportClose")
              : t("entry.actions.report")}
          </AuthGatedActionButton>
        </div>
      </div>

      {favoriteErrorMessage ? (
        <StatusNotice tone="error" align="left">
          {favoriteErrorMessage}
        </StatusNotice>
      ) : null}

      {reportNotice ? (
        <StatusNotice tone={reportNotice.tone} align="left">
          {reportNotice.message}
        </StatusNotice>
      ) : null}

      {isShareOpen ? (
        <div id={sharePanelId}>
          <EntrySharePanel
            canUseNativeShare={canUseNativeShare}
            notice={shareNotice}
            onCopyLink={() => void copyLink()}
            onCopyText={() => void copyText()}
            onNativeShare={() => void nativeShare()}
            shareLinks={shareLinks}
            sharePayload={sharePayload}
          />
        </div>
      ) : null}

      {isReportPanelVisible ? (
        <EntryReportPanel
          entry={entry}
          language={language}
          onClose={closeReportPanel}
          onSubmitted={handleReportSubmitted}
        />
      ) : null}
    </div>
  );
}
