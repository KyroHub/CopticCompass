"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaFacebookF,
  FaGithub,
  FaInstagram,
  FaLinkedinIn,
  FaXTwitter,
} from "react-icons/fa6";

import { iconButtonClassName } from "@/components/Button";
import { cx } from "@/lib/classes";
import {
  getContactPath,
  getContributorsPath,
  getDevelopersPath,
  getFaqPath,
  getPrivacyPath,
  getTermsPath,
} from "@/lib/locale";

import { useLanguage } from "./LanguageProvider";

const socialLinks = [
  {
    href: "https://x.com/copticcompass",
    icon: FaXTwitter,
    label: "X (Twitter)",
  },
  {
    href: "https://www.instagram.com/copticcompass",
    icon: FaInstagram,
    label: "Instagram",
  },
  {
    href: "https://www.linkedin.com/company/coptic-compass",
    icon: FaLinkedinIn,
    label: "LinkedIn",
  },
  {
    href: "https://www.facebook.com/61563109659451",
    icon: FaFacebookF,
    label: "Facebook",
  },
  {
    href: "https://github.com/KyroHub",
    icon: FaGithub,
    label: "GitHub",
  },
] as const;

export function Footer() {
  const { language, t } = useLanguage();
  const pathname = usePathname() ?? "";
  const currentYear = new Date().getFullYear();
  const brandLabel = t("home.title");
  const isShenuteRoute = /(^|\/)shenute(?:\/|$)/.test(pathname);
  const footerLinks = [
    { href: getPrivacyPath(language), label: t("footer.privacy") },
    { href: getTermsPath(language), label: t("footer.terms") },
    { href: getFaqPath(language), label: t("footer.faq") },
    { href: getContactPath(language), label: t("nav.contact") },
    { href: getDevelopersPath(language), label: t("footer.developers") },
    { href: getContributorsPath(language), label: t("footer.contributors") },
    { href: "/api-docs", label: t("footer.apiDocs") },
  ];

  return (
    <footer
      className={cx(
        "relative z-40 mt-auto w-full border-t border-line/80 bg-paper",
        isShenuteRoute && "hidden md:block",
      )}
    >
      <div className="site-container flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <p className="text-center text-sm leading-6 text-muted md:text-left">
            &copy; {currentYear} Coptic Compass. {t("footer.rights")}
          </p>
          <p className="text-center text-sm leading-6 text-muted/80 md:text-left">
            {brandLabel} {t("footer.credit")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted/70 md:justify-start">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className="transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {socialLinks.map(({ href, icon: Icon, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={iconButtonClassName()}
              title={label}
            >
              <span className="sr-only">{label}</span>
              <Icon className="h-[18px] w-[18px]" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
