"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { FloatingTooltip } from "@/components/FloatingTooltip";
import { useLanguage } from "@/components/LanguageProvider";
import { cx } from "@/lib/classes";
import { getLoginPath } from "@/lib/supabase/config";

type AuthGatedActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children: ReactNode;
  isAuthenticated: boolean;
  isReady: boolean;
  lockedOpen?: boolean;
  lockedContent?: ReactNode;
  lockedMessage: string;
  onLockedOpenChange?: (visible: boolean) => void;
  tooltipClassName?: string;
  wrapperClassName?: string;
};

export function AuthGatedActionButton({
  children,
  className,
  isAuthenticated,
  isReady,
  lockedOpen,
  lockedContent,
  lockedMessage,
  onLockedOpenChange,
  tooltipClassName,
  type = "button",
  wrapperClassName,
  ...buttonProps
}: AuthGatedActionButtonProps) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const suppressNextLockedClickRef = useRef(false);
  const [canHoverLockedButton, setCanHoverLockedButton] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : false,
  );
  const [isHoveringLockedButton, setIsHoveringLockedButton] = useState(false);
  const [uncontrolledLockedOpen, setUncontrolledLockedOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const isLockedMessageVisible =
    lockedOpen === undefined ? uncontrolledLockedOpen : lockedOpen;
  const loginHref = getLoginPath(pathname ?? undefined);

  const setLockedOpen = (visible: boolean) => {
    if (lockedOpen === undefined) {
      setUncontrolledLockedOpen(visible);
    }

    onLockedOpenChange?.(visible);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateHoverCapability = () => {
      setCanHoverLockedButton(hoverQuery.matches);
    };

    updateHoverCapability();
    hoverQuery.addEventListener("change", updateHoverCapability);

    return () => {
      hoverQuery.removeEventListener("change", updateHoverCapability);

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!isReady) {
    return null;
  }

  if (!isAuthenticated) {
    const tooltipVisible =
      (canHoverLockedButton && isHoveringLockedButton) ||
      isLockedMessageVisible;
    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const hideLockedMessage = () => {
      clearHideTimer();
      setLockedOpen(false);
    };

    const showLockedMessage = () => {
      setLockedOpen(true);
      clearHideTimer();

      hideTimerRef.current = window.setTimeout(() => {
        setLockedOpen(false);
        hideTimerRef.current = null;
      }, 2400);
    };

    return (
      <div className={cx("group relative inline-block", wrapperClassName)}>
        <button
          ref={buttonRef}
          type={type}
          aria-describedby={tooltipVisible ? tooltipId : undefined}
          data-locked="true"
          className={cx(className, "cursor-not-allowed opacity-50")}
          onPointerDown={(event) => {
            if (canHoverLockedButton || !isLockedMessageVisible) {
              return;
            }

            event.preventDefault();
            suppressNextLockedClickRef.current = true;
            hideLockedMessage();
          }}
          onTouchStart={(event) => {
            if (canHoverLockedButton || !isLockedMessageVisible) {
              return;
            }

            event.preventDefault();
            suppressNextLockedClickRef.current = true;
            hideLockedMessage();
          }}
          onClick={(event) => {
            event.preventDefault();

            if (suppressNextLockedClickRef.current) {
              suppressNextLockedClickRef.current = false;
              return;
            }

            if (
              isLockedMessageVisible &&
              !(canHoverLockedButton && isHoveringLockedButton)
            ) {
              hideLockedMessage();
              return;
            }

            showLockedMessage();
          }}
          onMouseEnter={() => {
            if (canHoverLockedButton) {
              setIsHoveringLockedButton(true);
            }
          }}
          onMouseLeave={() => {
            if (canHoverLockedButton) {
              setIsHoveringLockedButton(false);
            }
          }}
        >
          {lockedContent ?? (
            <>
              <Lock className="h-4 w-4" />
              {children}
            </>
          )}
        </button>
        <FloatingTooltip
          anchorRef={buttonRef}
          className={cx(
            "w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-stone-700 bg-stone-900/95 px-3 py-3 text-center text-xs leading-5 text-white shadow-lg",
            tooltipClassName,
          )}
          id={tooltipId}
          isOpen={tooltipVisible}
        >
          <div className="space-y-3">
            <p>{lockedMessage}</p>
            <Link
              href={loginHref}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-stone-900 transition-colors hover:bg-stone-100"
            >
              {t("nav.login")}
            </Link>
          </div>
        </FloatingTooltip>
      </div>
    );
  }

  return (
    <button type={type} className={className} {...buttonProps}>
      {children}
    </button>
  );
}
