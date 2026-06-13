"use client";

import {
  ArrowRight,
  Bot,
  GraduationCap,
  LibraryBig,
  Search,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { DEFAULT_PRACTICE_DECK_ID } from "@/features/practice/lib/practiceDeckDefaults";
import { cx } from "@/lib/classes";
import {
  getAnalyticsPath,
  getDevelopersPath,
  getDictionaryPath,
  getGrammarPath,
  getPracticePath,
  getPublicationsPath,
  getShenutePath,
} from "@/lib/locale";

type Tone = "coptic" | "gold" | "ink" | "surface";

type PlatformPillarLink = {
  href: string;
  label: string;
};

type PlatformPillarCardProps = {
  description: string;
  icon: LucideIcon;
  links: PlatformPillarLink[];
  title: string;
  tone: Tone;
};

const TONE_CLASSES: Record<
  Tone,
  {
    borderClassName: string;
    iconClassName: string;
    linkClassName: string;
  }
> = {
  coptic: {
    borderClassName: "hover:border-coptic/35",
    iconClassName: "border-coptic/20 bg-coptic-soft text-coptic",
    linkClassName: "text-coptic",
  },
  gold: {
    borderClassName: "hover:border-accent/45",
    iconClassName:
      "border-accent/25 bg-accent-soft text-accent-strong dark:text-ink",
    linkClassName: "text-accent-strong dark:text-ink",
  },
  ink: {
    borderClassName: "hover:border-ink/25 dark:hover:border-paper/25",
    iconClassName: "border-line bg-elevated text-ink",
    linkClassName: "text-ink",
  },
  surface: {
    borderClassName: "hover:border-line",
    iconClassName: "border-line bg-surface text-muted",
    linkClassName: "text-ink",
  },
};

const platformPillarCardClassName = surfacePanelClassName({
  rounded: "lg",
  interactive: true,
  shadow: "soft",
  className: "group flex h-full flex-col p-5 text-left md:p-6",
});

function PlatformPillarCard({
  description,
  icon: Icon,
  links,
  title,
  tone,
}: PlatformPillarCardProps) {
  const theme = TONE_CLASSES[tone];

  return (
    <article className={cx(platformPillarCardClassName, theme.borderClassName)}>
      <span
        className={cx(
          "inline-flex h-10 w-10 items-center justify-center rounded-md border",
          theme.iconClassName,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>

      <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted md:text-base md:leading-7">
        {description}
      </p>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line/70 pt-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              prefetch={false}
              className={cx(
                "group/link inline-flex items-center gap-2 text-sm font-semibold transition hover:text-ink focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                theme.linkClassName,
              )}
            >
              {link.label}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function HomePageClient() {
  const { language, t } = useLanguage();
  const analyticsHref = getAnalyticsPath(language);
  const dictionaryHref = getDictionaryPath(language);
  const practiceHref = getPracticePath(language, DEFAULT_PRACTICE_DECK_ID);
  const grammarHref = getGrammarPath(language);
  const publicationsHref = getPublicationsPath(language);
  const shenuteHref = getShenutePath();
  const developersHref = getDevelopersPath(language);

  const platformPillars: PlatformPillarCardProps[] = [
    {
      icon: Search,
      title: t("home.pillars.referenceTitle"),
      description: t("home.pillars.referenceDesc"),
      tone: "ink",
      links: [
        { href: dictionaryHref, label: t("home.pillars.dictionaryLink") },
        { href: analyticsHref, label: t("home.pillars.analyticsLink") },
      ],
    },
    {
      icon: GraduationCap,
      title: t("home.pillars.learnTitle"),
      description: t("home.pillars.learnDesc"),
      tone: "coptic",
      links: [
        { href: grammarHref, label: t("home.pillars.grammarLink") },
        { href: practiceHref, label: t("home.pillars.practiceLink") },
      ],
    },
    {
      icon: LibraryBig,
      title: t("home.pillars.publishTitle"),
      description: t("home.pillars.publishDesc"),
      tone: "gold",
      links: [{ href: publicationsHref, label: t("home.publications") }],
    },
    {
      icon: Bot,
      title: t("home.pillars.assistBuildTitle"),
      description: t("home.pillars.assistBuildDesc"),
      tone: "surface",
      links: [
        { href: shenuteHref, label: t("home.shenute.title") },
        { href: developersHref, label: t("home.developers.title") },
      ],
    },
  ];

  return (
    <PageShell
      className="min-h-screen px-4 pb-10 pt-3 sm:px-6 md:pb-14"
      contentClassName="mx-auto w-full max-w-6xl space-y-14 text-left md:space-y-20"
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashInset,
      ]}
    >
      <section className="grid items-center gap-8 py-6 sm:py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:gap-12 lg:py-14">
        <div className="order-2 lg:order-1">
          <PageHeader
            align="left"
            className="[&_h1]:text-5xl [&_p]:text-base [&_p]:leading-7 sm:[&_h1]:text-6xl sm:[&_p]:text-lg md:[&_h1]:text-7xl md:[&_p]:text-xl"
            eyebrow={t("home.eyebrow")}
            eyebrowClassName="text-coptic"
            title={
              <span className="font-coptic font-normal tracking-normal">
                {t("home.title")}
              </span>
            }
            description={t("home.subtitle")}
            size="hero"
            tone="brand"
          />

          <div className="mt-7 grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap">
            <Link
              href={dictionaryHref}
              prefetch={false}
              className={buttonClassName({
                className: "w-full sm:w-auto",
                size: "lg",
                variant: "primary",
              })}
            >
              {t("home.hero.primaryCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={practiceHref}
              prefetch={false}
              className={buttonClassName({
                className: "w-full sm:w-auto",
                size: "lg",
                variant: "secondary",
              })}
            >
              {t("home.hero.secondaryCta")}
            </Link>
          </div>
        </div>

        <div className="order-1 flex items-center justify-center border-b border-line/70 pb-7 lg:order-2 lg:min-h-[360px] lg:border-b-0 lg:border-l lg:pb-0 lg:pl-12">
          <div className="relative h-44 w-44 sm:h-52 sm:w-52 lg:h-72 lg:w-72">
            <Image
              src="/logo/Coptic_Compass_Primary.svg"
              alt="Coptic Compass Logo"
              fill
              sizes="(max-width: 640px) 176px, (max-width: 1024px) 208px, 288px"
              className="object-contain dark:hidden"
              priority
              loading="eager"
            />
            <Image
              src="/logo/Coptic_Compass_Secondary.svg"
              alt="Coptic Compass Logo"
              fill
              sizes="(max-width: 640px) 176px, (max-width: 1024px) 208px, 288px"
              className="hidden object-contain dark:block"
              priority
              loading="eager"
            />
          </div>
        </div>
      </section>

      <section
        id="mission"
        className="scroll-mt-28 overflow-hidden rounded-lg border border-ink/10 bg-ink text-paper shadow-panel dark:border-line dark:bg-surface/90 dark:text-ink lg:grid lg:grid-cols-[1.15fr_0.85fr]"
      >
        <div className="p-6 sm:p-8 md:p-10 lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            {t("home.mission.eyebrow")}
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight text-paper dark:text-ink md:text-4xl">
            {t("home.mission.title")}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-paper/70 dark:text-muted md:text-lg md:leading-8">
            {t("home.mission.body")}
          </p>
        </div>

        <div className="border-t border-paper/15 dark:border-line lg:border-l lg:border-t-0">
          <div className="p-6 sm:p-8 lg:p-9">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold dark:text-accent">
              {t("home.promise.title")}
            </p>
            <p className="mt-3 leading-7 text-paper/70 dark:text-muted">
              {t("home.promise.body")}
            </p>
          </div>
          <div className="border-t border-paper/15 p-6 sm:p-8 dark:border-line lg:p-9">
            <p className="text-xs font-semibold uppercase tracking-widest text-coptic-soft dark:text-coptic">
              {t("home.audience.title")}
            </p>
            <p className="mt-3 leading-7 text-paper/70 dark:text-muted">
              {t("home.audience.body")}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-8 md:space-y-10">
        <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-coptic">
              {t("home.platform.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
              {t("home.platform.title")}
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted md:justify-self-end md:text-lg md:leading-8">
            {t("home.platform.desc")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {platformPillars.map((pillar) => (
            <PlatformPillarCard key={pillar.title} {...pillar} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-t border-line py-10 md:grid-cols-[1fr_auto] md:items-end md:py-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-strong dark:text-accent">
            {t("home.closing.eyebrow")}
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink md:text-3xl">
            {t("home.closing.title")}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted md:text-lg md:leading-8">
            {t("home.closing.body")}
          </p>
        </div>
        <Link
          href={publicationsHref}
          prefetch={false}
          className={buttonClassName({
            className: "w-full md:w-auto",
            size: "md",
            variant: "secondary",
          })}
        >
          {t("home.publications.cta")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </PageShell>
  );
}
