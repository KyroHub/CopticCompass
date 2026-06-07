"use client";

import { LayoutDashboard, LogIn } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { buttonClassName, controlButtonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverArrow,
} from "@/components/Popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { cx } from "@/lib/classes";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { loadBrowserUser } from "@/lib/supabase/clientAuth";

import {
  getNavbarLinkClasses,
  type NavbarLinkVariant,
} from "./navbarLinkStyles";

import type { User } from "@supabase/supabase-js";

export type NavbarAuthControlProps = {
  dashboardHref: string;
  dashboardLabel: string;
  loginHref: string;
  loginLabel: string;
  onNavigate?: () => void;
  pathname: string;
  variant: NavbarLinkVariant;
};

export function NavbarAuthControl({
  dashboardHref,
  dashboardLabel,
  loginHref,
  loginLabel,
  onNavigate,
  pathname,
  variant,
}: NavbarAuthControlProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      return;
    }

    let isMounted = true;

    void loadBrowserUser(supabase)
      .then((nextUser) => {
        if (isMounted) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const href = user ? dashboardHref : loginHref;
  const label = user ? dashboardLabel : loginLabel;
  const hrefPathname = href.split("?")[0] ?? href;
  const isActive =
    pathname === hrefPathname || pathname.startsWith(`${hrefPathname}/`);
  const { linkClassName, labelClassName } = getNavbarLinkClasses({
    isActive,
    variant,
  });

  useEffect(() => {
    if (!isPromptOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      tooltipRef.current?.querySelector<HTMLAnchorElement>("a[href]")?.focus();
    }, 80);

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;

      if (
        buttonRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }

      setIsPromptOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPromptOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isPromptOpen]);

  if (variant === "desktop") {
    const activeControlClassName =
      "border-coptic/30 bg-coptic-soft/45 text-coptic dark:bg-coptic-soft/20";

    if (user) {
      return (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Link
              href={dashboardHref}
              prefetch={false}
              onClick={onNavigate}
              data-label={dashboardLabel}
              className={controlButtonClassName({
                className: cx(
                  "h-10 w-10 px-0",
                  isActive && activeControlClassName,
                ),
              })}
              aria-current={isActive ? "page" : undefined}
              aria-label={t("nav.openDashboard")}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{dashboardLabel}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent variant="micro">{dashboardLabel}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Popover open={isPromptOpen} onOpenChange={setIsPromptOpen}>
        <PopoverTrigger asChild>
          <button
            ref={buttonRef}
            type="button"
            aria-label={loginLabel}
            className={controlButtonClassName({
              className: cx(
                "h-10 w-10 px-0",
                isPromptOpen && activeControlClassName,
              ),
            })}
            data-label={loginLabel}
            title={loginLabel}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{loginLabel}</span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-64 max-w-[calc(100vw-2rem)] rounded-lg p-3 text-left"
          align="end"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            tooltipRef.current
              ?.querySelector<HTMLAnchorElement>("a[href]")
              ?.focus();
          }}
        >
          <div ref={tooltipRef} className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                {t("nav.authPrompt.title")}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {t("nav.authPrompt.description")}
              </p>
            </div>
            <Link
              href={loginHref}
              prefetch={false}
              onClick={() => {
                setIsPromptOpen(false);
                onNavigate?.();
              }}
              className={buttonClassName({
                className: "h-9 w-full px-3 text-xs",
                size: "sm",
              })}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {loginLabel}
            </Link>
          </div>
          <PopoverArrow />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNavigate}
      data-label={label}
      className={linkClassName}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={labelClassName}>{label}</span>
    </Link>
  );
}
