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

import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverArrow,
} from "@/components/Popover";
import { cx } from "@/lib/classes";
import { getLoginPath } from "@/lib/supabase/config";
import { useMediaQuery } from "@/lib/useMediaQuery";

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
};

const LOCKED_TOOLTIP_GRACE_MS = 1600;
const LOCKED_TOOLTIP_AUTO_HIDE_MS = 2400;
const HOVER_POINTER_MEDIA_QUERY = "(hover: hover) and (pointer: fine)";

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
  ...buttonProps
}: AuthGatedActionButtonProps) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const suppressNextLockedClickRef = useRef(false);
  const canHoverLockedButton = useMediaQuery(HOVER_POINTER_MEDIA_QUERY);
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
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!isReady) {
    return null;
  }

  if (!isAuthenticated) {
    const tooltipVisible = isHoveringLockedButton || isLockedMessageVisible;
    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const scheduleHideLockedMessage = (delay = LOCKED_TOOLTIP_GRACE_MS) => {
      clearHideTimer();

      hideTimerRef.current = window.setTimeout(() => {
        setLockedOpen(false);
        hideTimerRef.current = null;
      }, delay);
    };

    const hideLockedMessage = () => {
      clearHideTimer();
      setLockedOpen(false);
    };

    const showLockedMessage = (autoHideMs = LOCKED_TOOLTIP_AUTO_HIDE_MS) => {
      setLockedOpen(true);
      clearHideTimer();

      hideTimerRef.current = window.setTimeout(() => {
        setLockedOpen(false);
        hideTimerRef.current = null;
      }, autoHideMs);
    };

    const showHoverLockedMessage = () => {
      if (!canHoverLockedButton) {
        return;
      }

      clearHideTimer();
      setLockedOpen(true);
    };

    return (
      <Popover open={tooltipVisible} onOpenChange={setLockedOpen}>
        <PopoverTrigger asChild>
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
              setIsHoveringLockedButton(true);
              showHoverLockedMessage();
            }}
            onMouseLeave={() => {
              setIsHoveringLockedButton(false);
              scheduleHideLockedMessage();
            }}
          >
            {lockedContent ?? (
              <>
                <Lock className="h-4 w-4" />
                {children}
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cx(
            "w-64 max-w-[calc(100vw-2rem)] rounded-lg p-3 text-center",
            tooltipClassName,
          )}
          id={tooltipId}
          onMouseEnter={() => {
            setIsHoveringLockedButton(true);
            showHoverLockedMessage();
          }}
          onMouseLeave={() => {
            setIsHoveringLockedButton(false);
            scheduleHideLockedMessage();
          }}
        >
          <div className="space-y-3">
            <p>{lockedMessage}</p>
            <Link
              href={loginHref}
              className={buttonClassName({
                className: "h-9 px-3 text-xs",
                size: "sm",
              })}
            >
              {t("nav.login")}
            </Link>
          </div>
          <PopoverArrow />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <button type={type} className={className} {...buttonProps}>
      {children}
    </button>
  );
}
