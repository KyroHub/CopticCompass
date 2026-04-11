"use client";

import { Menu, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  getChatPath,
  getContactPath,
  getDashboardPath,
  getDictionaryPath,
  getGrammarPath,
  getLocalizedHomePath,
  getPublicationsPath,
} from "@/lib/locale";
import { getLoginPath } from "@/lib/supabase/config";

import { useLanguage } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";

const NavbarAuthLink = dynamic(
  () =>
    import("./NavbarAuthLink").then((module) => ({
      default: module.NavbarAuthLink,
    })),
  {
    ssr: false,
    loading: () => (
      <Link
        href="/login"
        data-label="Sign In"
        className="group inline-grid h-10 items-center justify-items-center rounded-full px-4 text-sm tracking-[0.02em] text-stone-600 transition-all duration-200 dark:text-stone-400"
      >
        <span className="col-start-1 row-start-1 font-medium">Sign In</span>
      </Link>
    ),
  },
);

export function Navbar() {
  const pathname = usePathname() ?? "";
  const { language, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dashboardHref = getDashboardPath(language);
  const loginHref = getLoginPath(dashboardHref);
  const brandLabel = t("home.title");

  const links = [
    { href: getPublicationsPath(language), label: t("nav.publications") },
    { href: getDictionaryPath(language), label: t("nav.dictionary") },
    { href: getGrammarPath(language), label: t("nav.grammar") },
    { href: getChatPath(), label: t("nav.chat") },
    { href: getContactPath(language), label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/70 backdrop-blur-md shadow-sm transition-colors duration-300 dark:border-stone-800 dark:bg-stone-950/70">
      <div className="site-container">
        <div className="flex min-h-[4.75rem] items-center justify-between gap-4 py-3">
          <Link
            href={getLocalizedHomePath(language)}
            className="group flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25"
          >
            <div className="relative h-10 w-10 shrink-0">
              <Image
                src="/logo/logo-colored.png"
                alt={`${brandLabel} logo`}
                fill
                sizes="40px"
                className="object-contain drop-shadow"
              />
            </div>
            <span className="whitespace-nowrap text-xl font-bold text-transparent bg-gradient-to-r from-stone-800 to-stone-500 bg-clip-text transition-colors dark:from-stone-100 dark:to-stone-400">
              {brandLabel}
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 lg:flex"
          >
            {links.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-label={link.label}
                  className={`group inline-grid h-10 items-center justify-items-center rounded-full px-4 text-sm tracking-[0.02em] text-center transition-all duration-200 before:invisible before:col-start-1 before:row-start-1 before:h-0 before:overflow-hidden before:font-semibold before:content-[attr(data-label)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25 ${
                    isActive
                      ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
                      : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
                  }`}
                >
                  <span
                    className={`col-start-1 row-start-1 ${isActive ? "font-semibold" : "font-medium group-hover:font-semibold"}`}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
            <NavbarAuthLink
              dashboardHref={dashboardHref}
              dashboardLabel={t("nav.dashboard")}
              loginHref={loginHref}
              loginLabel={t("nav.login") || "Sign In"}
              pathname={pathname}
              variant="desktop"
            />
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <button
              type="button"
              className="topbar-control lg:hidden"
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
            className="mb-3 flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white/80 p-2 shadow-md backdrop-blur-md lg:hidden dark:border-stone-800 dark:bg-stone-900/70 dark:shadow-black/20"
          >
            {links.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-label={link.label}
                  className={`group grid justify-items-center rounded-xl px-4 py-3 text-center text-sm tracking-[0.02em] transition-colors before:invisible before:col-start-1 before:row-start-1 before:h-0 before:overflow-hidden before:font-semibold before:content-[attr(data-label)] ${
                    isActive
                      ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900/60 dark:hover:text-stone-200"
                  }`}
                >
                  <span
                    className={`col-start-1 row-start-1 ${isActive ? "font-semibold" : "font-medium group-hover:font-semibold"}`}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
            <NavbarAuthLink
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
