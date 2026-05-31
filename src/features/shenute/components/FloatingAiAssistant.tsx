"use client";

import { LoaderCircle, MessageCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { cx } from "@/lib/classes";

const FLOATING_ASSISTANT_CONTAINER_CLASS =
  "fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-50 transition-opacity duration-200 ease-out hover:opacity-100 focus-within:opacity-100 motion-reduce:transition-none sm:bottom-5 sm:right-5";

const FLOATING_ASSISTANT_BUTTON_CLASS =
  "inline-flex h-12 w-12 items-center justify-center gap-2 rounded-lg border border-coptic/25 bg-surface/95 text-coptic shadow-panel backdrop-blur-md transition-colors hover:border-coptic/40 hover:bg-coptic-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coptic/30 dark:bg-surface/95 sm:h-auto sm:w-auto sm:px-5 sm:py-3 sm:text-sm sm:font-semibold";

const LAUNCHER_SCROLLING_OPACITY = 0.52;
const LAUNCHER_SCROLL_IDLE_DELAY_MS = 720;

function isDenseStudyRoute(pathname: string | null) {
  return Boolean(
    pathname &&
    /(^|\/)(analytics|dictionary|entry|grammar)(?:\/|$)/.test(pathname),
  );
}

function isHomeRoute(pathname: string | null) {
  return Boolean(pathname && /^\/(?:en|nl)?\/?$/.test(pathname));
}

function preloadFloatingAiAssistantPanel() {
  void import("./FloatingAiAssistantPanel");
}

function FloatingAiAssistantLoading() {
  const { t } = useLanguage();

  return (
    <div className={FLOATING_ASSISTANT_CONTAINER_CLASS}>
      <div
        className={FLOATING_ASSISTANT_BUTTON_CLASS}
        role="status"
        aria-live="polite"
      >
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">
          {t("shenute.launcher.loading")}
        </span>
      </div>
    </div>
  );
}

const FloatingAiAssistantPanel = dynamic(
  () =>
    import("./FloatingAiAssistantPanel").then((module) => ({
      default: module.FloatingAiAssistantPanel,
    })),
  {
    ssr: false,
    loading: () => <FloatingAiAssistantLoading />,
  },
);

/**
 * Keeps the shared app frame light until the user explicitly opens Shenute AI.
 */
export function FloatingAiAssistant() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [hasOpened, setHasOpened] = useState(false);
  const [launcherOpacity, setLauncherOpacity] = useState(1);
  const isShenuteRoute = Boolean(
    pathname && /(^|\/)shenute(?:\/|$)/.test(pathname),
  );
  const isExcludedRoute = isShenuteRoute || isHomeRoute(pathname);

  useEffect(() => {
    if (isExcludedRoute) {
      return;
    }

    if (isDenseStudyRoute(pathname)) {
      return;
    }

    const preload = () => preloadFloatingAiAssistantPanel();
    const idleCallback =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(preload, { timeout: 1800 })
        : undefined;
    const timeout = window.setTimeout(preload, 1200);

    return () => {
      window.clearTimeout(timeout);
      if (idleCallback !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleCallback);
      }
    };
  }, [isExcludedRoute, pathname]);

  useEffect(() => {
    if (isExcludedRoute || hasOpened) {
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
  }, [hasOpened, isExcludedRoute]);

  if (isExcludedRoute) {
    return null;
  }

  if (hasOpened) {
    return <FloatingAiAssistantPanel initialOpen />;
  }

  const launcherStyle = {
    "--floating-shenute-opacity": launcherOpacity.toFixed(2),
  } as CSSProperties;

  return (
    <div
      className={cx(
        FLOATING_ASSISTANT_CONTAINER_CLASS,
        "opacity-[var(--floating-shenute-opacity)]",
      )}
      data-testid="floating-shenute-launcher"
      style={launcherStyle}
    >
      <button
        type="button"
        aria-label={t("shenute.launcher.open")}
        title={t("shenute.launcher.open")}
        onClick={() => {
          setHasOpened(true);
        }}
        onPointerDown={preloadFloatingAiAssistantPanel}
        onFocus={() => {
          preloadFloatingAiAssistantPanel();
        }}
        onMouseEnter={() => {
          preloadFloatingAiAssistantPanel();
        }}
        className={FLOATING_ASSISTANT_BUTTON_CLASS}
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">
          {t("shenute.launcher.open")}
        </span>
      </button>
    </div>
  );
}
