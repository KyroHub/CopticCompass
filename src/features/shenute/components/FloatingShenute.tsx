"use client";

import { LoaderCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { cx } from "@/lib/classes";

import {
  FLOATING_SHENUTE_CONTAINER_CLASS,
  FLOATING_SHENUTE_LAUNCHER_CLASS,
} from "./floatingShenuteClasses";
import { FloatingShenuteTrigger } from "./FloatingShenuteTrigger";

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

function preloadFloatingShenutePanel() {
  void import("./FloatingShenutePanel");
}

function FloatingShenuteLoading() {
  const { t } = useLanguage();

  return (
    <div className={FLOATING_SHENUTE_CONTAINER_CLASS}>
      <div
        className={FLOATING_SHENUTE_LAUNCHER_CLASS}
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

const FloatingShenutePanel = dynamic(
  () =>
    import("./FloatingShenutePanel").then((module) => ({
      default: module.FloatingShenutePanel,
    })),
  {
    ssr: false,
    loading: () => <FloatingShenuteLoading />,
  },
);

/**
 * Keeps the shared app frame light until the user explicitly opens Shenute AI.
 */
export function FloatingShenute() {
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

    const preload = () => preloadFloatingShenutePanel();
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
    return <FloatingShenutePanel initialOpen />;
  }

  const launcherStyle = {
    "--floating-shenute-opacity": launcherOpacity.toFixed(2),
  } as CSSProperties;

  return (
    <div
      className={cx(
        FLOATING_SHENUTE_CONTAINER_CLASS,
        "opacity-[var(--floating-shenute-opacity)]",
      )}
      data-testid="floating-shenute-launcher"
      style={launcherStyle}
    >
      <FloatingShenuteTrigger
        label={t("shenute.launcher.open")}
        onClick={() => {
          setHasOpened(true);
        }}
        onPointerDown={preloadFloatingShenutePanel}
        onFocus={() => {
          preloadFloatingShenutePanel();
        }}
        onMouseEnter={() => {
          preloadFloatingShenutePanel();
        }}
      />
    </div>
  );
}
