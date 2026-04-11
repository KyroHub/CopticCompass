"use client";

import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  LibraryBig,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";
import {
  getDictionaryPath,
  getGrammarPath,
  getPublicationsPath,
} from "@/lib/locale";

type FeatureCardTone = "emerald" | "sky";

type FeatureCardProps = {
  cta: string;
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
  tone: FeatureCardTone;
};

const FEATURE_CARD_BASE_CLASS = surfacePanelClassName({
  rounded: "3xl",
  interactive: true,
  className:
    "group relative flex h-full min-h-[280px] cursor-pointer flex-col items-center overflow-hidden p-8 md:p-10",
});

const FEATURE_CARD_TONES: Record<
  FeatureCardTone,
  {
    cardClassName: string;
    glowClassName: string;
    iconClassName: string;
    ctaClassName: string;
  }
> = {
  emerald: {
    cardClassName:
      "hover:border-emerald-300 hover:shadow-emerald-500/10 dark:hover:border-emerald-700",
    glowClassName: "from-emerald-500/5",
    iconClassName:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    ctaClassName: "text-emerald-600 dark:text-emerald-400",
  },
  sky: {
    cardClassName:
      "hover:border-sky-300 hover:shadow-sky-500/10 dark:hover:border-sky-700",
    glowClassName: "from-sky-500/5",
    iconClassName:
      "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
    ctaClassName: "text-sky-600 dark:text-sky-400",
  },
};

function FeatureCard({
  cta,
  description,
  href,
  icon: Icon,
  title,
  tone,
}: FeatureCardProps) {
  const theme = FEATURE_CARD_TONES[tone];

  return (
    <Link
      href={href}
      className={cx(FEATURE_CARD_BASE_CLASS, theme.cardClassName)}
    >
      <div
        className={cx(
          "absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          theme.glowClassName,
        )}
      />

      <div
        className={cx(
          "z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-full",
          theme.iconClassName,
        )}
      >
        <Icon className="h-8 w-8" />
      </div>

      <div className="z-10 flex w-full flex-1 flex-col items-center justify-between">
        <div className="space-y-3">
          <h2 className="text-center text-3xl font-semibold text-stone-800 dark:text-stone-200">
            {title}
          </h2>
          <p className="text-center leading-7 text-stone-500 dark:text-stone-400">
            {description}
          </p>
        </div>

        <span
          className={cx(
            "mt-8 inline-flex items-center gap-2 text-sm font-semibold",
            theme.ctaClassName,
          )}
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default function HomePageClient() {
  const { language, t } = useLanguage();
  const featureCards: FeatureCardProps[] = [
    {
      href: getPublicationsPath(language),
      icon: LibraryBig,
      title: t("home.publications"),
      description: t("home.publications.desc"),
      cta: t("home.publications.cta"),
      tone: "emerald",
    },
    {
      href: getDictionaryPath(language),
      icon: BookOpen,
      title: t("home.copticDict"),
      description: t("home.copticDict.desc"),
      cta: t("home.dictionary.cta"),
      tone: "sky",
    },
    {
      href: getGrammarPath(language),
      icon: GraduationCap,
      title: t("grammar.title"),
      description: t("grammar.subtitle"),
      cta: t("home.grammar.cta"),
      tone: "sky",
    },
  ];

  return (
    <PageShell
      className="min-h-screen flex flex-col items-center justify-center p-6"
      contentClassName="max-w-4xl w-full space-y-12 text-center"
      accents={[
        pageShellAccents.heroSkyArc,
        pageShellAccents.topRightEmeraldOrbInset,
      ]}
    >
      <section className="space-y-4 flex flex-col items-center">
        <div className="relative w-48 h-48 md:w-64 md:h-64 mb-2 transition-transform duration-500 hover:scale-[1.03]">
          <Image
            src="/logo/logo-colored.png"
            alt="Coptic Compass Logo"
            fill
            sizes="(max-width: 768px) 192px, 256px"
            className="object-contain drop-shadow-2xl dark:drop-shadow-[0_20px_20px_rgba(255,255,255,0.05)]"
            priority
          />
        </div>
        <PageHeader
          eyebrow={t("home.eyebrow")}
          eyebrowVariant="badge"
          title={t("home.title")}
          description={t("home.subtitle")}
          size="hero"
          tone="brand"
        />
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
          {t("home.credit")}
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
        {featureCards.map((card) => (
          <FeatureCard key={card.href} {...card} />
        ))}
      </section>

      <section className="mt-16 sm:mt-24 w-full bg-gradient-to-r from-stone-900 to-stone-800 dark:from-stone-950 dark:to-stone-900 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-stone-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/16 rounded-full blur-[90px] pointer-events-none" />

        <div className="text-center md:text-left z-10 flex-1">
          <span className="inline-block px-3 py-1 bg-sky-500/15 border border-sky-400/25 text-sky-300 text-xs font-semibold uppercase tracking-widest rounded-full mb-4">
            {t("home.comingSoon")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-50 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)] mb-3">
            {t("home.app.title")}
          </h2>
          <p className="text-stone-400 text-lg leading-8 max-w-xl mx-auto md:mx-0">
            {t("home.app.desc")}
          </p>
        </div>

        <div className="z-10 flex-shrink-0">
          <div
            className="inline-block opacity-80 cursor-not-allowed hover:opacity-100 transition-opacity duration-300"
            title={t("home.comingSoon")}
          >
            <Image
              src="https://toolbox.marketingtools.apple.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&releaseDate=1276560000&h=7e7b68fad19738b5649a1bfb78ff46e9"
              alt="Download on the App Store"
              width={250}
              height={83}
              className="h-14 w-auto md:h-16 drop-shadow-md"
              unoptimized
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
