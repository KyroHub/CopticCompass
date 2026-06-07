"use client";

import { BarChart3, BookOpen, ChevronDown, LogIn, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";

import { controlButtonClassName } from "@/components/Button";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { DEFAULT_PRACTICE_DECK_ID } from "@/features/practice/lib/practiceDeckDefaults";
import { cx } from "@/lib/classes";
import {
  getAnalyticsPath,
  getDashboardPath,
  getDictionaryPath,
  getPracticePath,
  getGrammarPath,
  getLocalizedHomePath,
  getPublicationsPath,
  getShenutePath,
} from "@/lib/locale";
import { getLoginPath } from "@/lib/supabase/config";

import { useLanguage } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import {
  getNavbarLinkClasses,
  type NavbarLinkVariant,
} from "./navbarLinkStyles";
import { ThemeToggle } from "./ThemeToggle";

import type { NavbarAuthControlProps } from "./NavbarAuthControl";

type NavbarAuthControlComponent = ComponentType<NavbarAuthControlProps>;

type NavbarLink = {
  href: string;
  label: string;
};

type DictionaryToolLink = NavbarLink & {
  description: string;
  icon: typeof BookOpen;
};

function isActivePath(pathname: string, href: string) {
  const hrefPathname = href.split("?")[0] ?? href;

  return pathname === hrefPathname || pathname.startsWith(`${hrefPathname}/`);
}

function LazyNavbarAuthControl(props: NavbarAuthControlProps) {
  const [AuthControl, setAuthControl] =
    useState<NavbarAuthControlComponent | null>(null);
  const hrefPathname = props.loginHref.split("?")[0] ?? props.loginHref;
  const isActive =
    props.pathname === hrefPathname ||
    props.pathname.startsWith(`${hrefPathname}/`);
  const { labelClassName, linkClassName } = getNavbarLinkClasses({
    isActive,
    variant: props.variant,
  });

  const loadAuthControl = useCallback(() => {
    if (AuthControl) {
      return;
    }

    void import("./NavbarAuthControl").then((module) => {
      setAuthControl(() => module.NavbarAuthControl);
    });
  }, [AuthControl]);

  useEffect(() => {
    loadAuthControl();
  }, [loadAuthControl]);

  if (AuthControl) {
    return <AuthControl {...props} />;
  }

  if (props.variant === "desktop") {
    return (
      <Link
        href={props.loginHref}
        prefetch={false}
        onClick={props.onNavigate}
        onFocus={loadAuthControl}
        onMouseEnter={loadAuthControl}
        data-label={props.loginLabel}
        className={controlButtonClassName({ className: "h-10 w-10 px-0" })}
        aria-current={isActive ? "page" : undefined}
        aria-label={props.loginLabel}
        title={props.loginLabel}
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{props.loginLabel}</span>
      </Link>
    );
  }

  return (
    <Link
      href={props.loginHref}
      prefetch={false}
      onClick={props.onNavigate}
      onFocus={loadAuthControl}
      onMouseEnter={loadAuthControl}
      data-label={props.loginLabel}
      className={linkClassName}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={labelClassName}>{props.loginLabel}</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname() ?? "";
  const { language, t } = useLanguage();
  const dictionaryMenuRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDictionaryMenuOpen, setIsDictionaryMenuOpen] = useState(false);
  const [isMobileDictionaryOpen, setIsMobileDictionaryOpen] = useState<
    boolean | null
  >(null);
  const dashboardHref = getDashboardPath(language);
  const loginHref = getLoginPath(dashboardHref);
  const brandLabel = t("home.title");

  const primaryLinks: NavbarLink[] = [
    { href: getPublicationsPath(language), label: t("nav.publications") },
    { href: getGrammarPath(language), label: t("nav.grammar") },
  ];
  const shenuteLink: NavbarLink = {
    href: getShenutePath(),
    label: t("nav.shenute"),
  };
  const practiceLink: NavbarLink = {
    href: getPracticePath(language, DEFAULT_PRACTICE_DECK_ID),
    label: t("nav.practice"),
  };
  const dictionaryToolLinks: DictionaryToolLink[] = [
    {
      description: t("nav.dictionarySearchDescription"),
      href: getDictionaryPath(language),
      icon: BookOpen,
      label: t("nav.dictionarySearchShort"),
    },
    {
      description: t("nav.analyticsDescription"),
      href: getAnalyticsPath(language),
      icon: BarChart3,
      label: t("nav.analyticsShort"),
    },
  ];
  const isDictionaryActive = dictionaryToolLinks.some((link) =>
    isActivePath(pathname, link.href),
  );
  const isMobileDictionaryExpanded =
    isMobileDictionaryOpen ?? isDictionaryActive;

  function renderNavbarLink(
    link: NavbarLink,
    variant: NavbarLinkVariant,
    onNavigate?: () => void,
  ) {
    const isActive = isActivePath(pathname, link.href);
    const { labelClassName, linkClassName } = getNavbarLinkClasses({
      isActive,
      variant,
    });

    return (
      <Link
        key={link.href}
        href={link.href}
        prefetch={false}
        onClick={onNavigate}
        data-label={link.label}
        className={linkClassName}
        aria-current={isActive ? "page" : undefined}
      >
        <span className={labelClassName}>{link.label}</span>
      </Link>
    );
  }

  useEffect(() => {
    if (!isDictionaryMenuOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        dictionaryMenuRef.current &&
        !dictionaryMenuRef.current.contains(event.target as Node)
      ) {
        setIsDictionaryMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDictionaryMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isDictionaryMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-paper/86 shadow-sm backdrop-blur-md transition-colors duration-300">
      <div className="site-container">
        <div className="grid min-h-[4.75rem] grid-cols-[auto_1fr_auto] items-center gap-3 py-3 xl:gap-4">
          <Link
            href={getLocalizedHomePath(language)}
            prefetch={false}
            className="group flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:gap-3"
          >
            <div className="relative h-[52px] w-[52px] shrink-0 lg:h-14 lg:w-14">
              <Image
                src="/logo/Coptic_Compass_Primary.svg"
                alt={`${brandLabel} logo`}
                fill
                sizes="(max-width: 1024px) 52px, 56px"
                loading="eager"
                className="object-contain dark:hidden"
              />
              <Image
                src="/logo/Coptic_Compass_Secondary.svg"
                alt={`${brandLabel} logo`}
                fill
                sizes="(max-width: 1024px) 52px, 56px"
                loading="eager"
                className="hidden object-contain dark:block"
              />
            </div>
            <span className="hidden min-w-0 whitespace-nowrap font-coptic text-2xl font-normal leading-none tracking-normal text-ink transition-colors lg:inline">
              {brandLabel}
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center justify-center gap-1 xl:flex"
          >
            {primaryLinks.map((link) => renderNavbarLink(link, "desktop"))}
            <div
              key="dictionary-menu"
              ref={dictionaryMenuRef}
              className="relative"
            >
              <button
                type="button"
                data-label={t("nav.dictionary")}
                className={cx(
                  "group inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-center text-sm tracking-[0.02em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                  isDictionaryActive
                    ? "bg-accent-soft text-accent-strong dark:bg-accent-soft/35 dark:text-accent"
                    : "text-muted hover:bg-elevated hover:text-ink",
                )}
                aria-expanded={isDictionaryMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsDictionaryMenuOpen((isOpen) => !isOpen)}
              >
                <span
                  data-label={t("nav.dictionary")}
                  className={cx(
                    "inline-grid items-center justify-items-center before:invisible before:col-start-1 before:row-start-1 before:h-0 before:overflow-hidden before:font-semibold before:content-[attr(data-label)]",
                    isDictionaryActive
                      ? "font-semibold"
                      : "font-medium group-hover:font-semibold",
                  )}
                >
                  <span className="col-start-1 row-start-1 whitespace-nowrap">
                    {t("nav.dictionary")}
                  </span>
                </span>
                <ChevronDown
                  className={cx(
                    "h-4 w-4 transition-transform",
                    isDictionaryMenuOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>

              {isDictionaryMenuOpen ? (
                <div
                  className={surfacePanelClassName({
                    className:
                      "absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 p-2",
                    shadow: "soft",
                    variant: "default",
                  })}
                  role="menu"
                  aria-label={t("nav.dictionaryMenu")}
                >
                  {dictionaryToolLinks.map((toolLink) => {
                    const Icon = toolLink.icon;
                    const isToolActive = isActivePath(pathname, toolLink.href);

                    return (
                      <Link
                        key={toolLink.href}
                        href={toolLink.href}
                        prefetch={false}
                        onClick={() => setIsDictionaryMenuOpen(false)}
                        className={cx(
                          "flex gap-3 rounded-lg px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                          isToolActive
                            ? "bg-accent-soft text-accent-strong dark:bg-accent-soft/35 dark:text-accent"
                            : "text-muted hover:bg-elevated hover:text-ink",
                        )}
                        role="menuitem"
                        aria-current={isToolActive ? "page" : undefined}
                      >
                        <Icon
                          className="mt-0.5 h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">
                            {toolLink.label}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted">
                            {toolLink.description}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
            {renderNavbarLink(practiceLink, "desktop")}
            {renderNavbarLink(shenuteLink, "desktop")}
          </nav>

          <div className="flex items-center justify-end gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <nav
              aria-label={t("nav.account")}
              className="hidden items-center gap-1 xl:flex"
            >
              <LazyNavbarAuthControl
                dashboardHref={dashboardHref}
                dashboardLabel={t("nav.dashboard")}
                loginHref={loginHref}
                loginLabel={t("nav.login") || "Sign In"}
                pathname={pathname}
                variant="desktop"
              />
            </nav>
            <button
              type="button"
              className={controlButtonClassName({
                className: cx(
                  "xl:hidden",
                  isMobileMenuOpen &&
                    "border-accent/30 bg-accent-soft text-accent-strong dark:bg-accent-soft/35 dark:text-accent",
                ),
              })}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-controls="mobile-navigation"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile"
            className={surfacePanelClassName({
              className: "mb-3 flex flex-col gap-1 p-2 xl:hidden",
              shadow: "soft",
            })}
          >
            {primaryLinks.map((link) =>
              renderNavbarLink(link, "mobile", () =>
                setIsMobileMenuOpen(false),
              ),
            )}
            <div key="mobile-dictionary-tools" className="space-y-1">
              <button
                type="button"
                data-label={t("nav.dictionary")}
                className={cx(
                  "group relative grid w-full place-items-center rounded-lg px-4 py-3 text-center text-sm tracking-[0.02em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                  isDictionaryActive
                    ? "bg-accent-soft text-accent-strong dark:bg-accent-soft/35 dark:text-accent"
                    : "text-muted hover:bg-elevated hover:text-ink",
                )}
                aria-controls="mobile-dictionary-tools"
                aria-expanded={isMobileDictionaryExpanded}
                onClick={() =>
                  setIsMobileDictionaryOpen(!isMobileDictionaryExpanded)
                }
              >
                <span
                  data-label={t("nav.dictionary")}
                  className={cx(
                    "inline-grid items-center justify-items-center before:invisible before:col-start-1 before:row-start-1 before:h-0 before:overflow-hidden before:font-semibold before:content-[attr(data-label)]",
                    isDictionaryActive
                      ? "font-semibold"
                      : "font-medium group-hover:font-semibold",
                  )}
                >
                  <span className="col-start-1 row-start-1 whitespace-nowrap">
                    {t("nav.dictionary")}
                  </span>
                </span>
                <ChevronDown
                  className={cx(
                    "pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform",
                    isMobileDictionaryExpanded && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>

              {isMobileDictionaryExpanded ? (
                <div
                  id="mobile-dictionary-tools"
                  className={surfacePanelClassName({
                    className: "p-1",
                    variant: "default",
                  })}
                  aria-label={t("nav.dictionaryMenu")}
                >
                  <div className="grid grid-cols-2 gap-1">
                    {dictionaryToolLinks.map((toolLink) => {
                      const Icon = toolLink.icon;
                      const isToolActive = isActivePath(
                        pathname,
                        toolLink.href,
                      );

                      return (
                        <Link
                          key={toolLink.href}
                          href={toolLink.href}
                          prefetch={false}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cx(
                            "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-md px-2 py-2 text-center text-xs font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                            isToolActive
                              ? "bg-accent-soft text-accent-strong dark:bg-accent-soft/35 dark:text-accent"
                              : "text-muted hover:bg-elevated hover:text-ink",
                          )}
                          aria-current={isToolActive ? "page" : undefined}
                        >
                          <Icon
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="max-w-full break-words">
                            {toolLink.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            {renderNavbarLink(practiceLink, "mobile", () =>
              setIsMobileMenuOpen(false),
            )}
            {renderNavbarLink(shenuteLink, "mobile", () =>
              setIsMobileMenuOpen(false),
            )}
            <LazyNavbarAuthControl
              dashboardHref={dashboardHref}
              dashboardLabel={t("nav.dashboard")}
              loginHref={loginHref}
              loginLabel={t("nav.login") || "Sign In"}
              onNavigate={() => setIsMobileMenuOpen(false)}
              pathname={pathname}
              variant="mobile"
            />
          </nav>
        )}
      </div>
    </header>
  );
}
