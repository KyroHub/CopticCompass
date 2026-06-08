"use client";

import {
  ArrowRight,
  BarChart3,
  Bot,
  Compass,
  GraduationCap,
  Layers3,
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
import { SurfacePanel, surfacePanelClassName } from "@/components/SurfacePanel";
import { DEFAULT_PRACTICE_DECK_ID } from "@/features/practice/lib/practiceDeckDefaults";
import { cx } from "@/lib/classes";
import {
  getAnalyticsPath,
  getDevelopersPath,
  getDictionaryPath,
  getPracticePath,
  getGrammarPath,
  getPublicationsPath,
  getShenutePath,
} from "@/lib/locale";

type Tone = "coptic" | "gold" | "ink" | "surface";

type LearningLoopStepProps = {
  cta: string;
  description: string;
  href: string;
  icon: LucideIcon;
  stepLabel: string;
  title: string;
  tone: Tone;
};

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

type IconTileProps = {
  icon: LucideIcon;
  size?: "sm" | "md";
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
    iconClassName: "bg-coptic-soft text-coptic",
    linkClassName: "text-coptic",
  },
  gold: {
    borderClassName: "hover:border-accent/45",
    iconClassName: "bg-accent-soft text-accent-strong dark:text-ink",
    linkClassName: "text-accent-strong dark:text-ink",
  },
  ink: {
    borderClassName: "hover:border-ink/25 dark:hover:border-paper/25",
    iconClassName: "bg-elevated text-ink",
    linkClassName: "text-ink",
  },
  surface: {
    borderClassName: "hover:border-line",
    iconClassName: "bg-surface text-muted",
    linkClassName: "text-ink",
  },
};

const learningLoopCardClassName = surfacePanelClassName({
  rounded: "lg",
  interactive: true,
  className: "group flex h-full flex-col overflow-hidden p-5 text-left md:p-7",
});

const platformPillarCardClassName = surfacePanelClassName({
  rounded: "lg",
  className:
    "flex h-full flex-col overflow-hidden p-5 text-left md:min-h-[220px] md:p-6 xl:min-h-[280px]",
});

function IconTile({ icon: Icon, size = "md", tone }: IconTileProps) {
  const isSmall = size === "sm";

  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        isSmall ? "h-9 w-9 md:h-10 md:w-10" : "h-10 w-10 md:h-12 md:w-12",
        TONE_CLASSES[tone].iconClassName,
      )}
    >
      <Icon
        className={isSmall ? "h-4 w-4 md:h-5 md:w-5" : "h-5 w-5 md:h-6 md:w-6"}
      />
    </span>
  );
}

function LearningLoopStep({
  cta,
  description,
  href,
  icon,
  stepLabel,
  title,
  tone,
}: LearningLoopStepProps) {
  const theme = TONE_CLASSES[tone];

  return (
    <li className="min-w-0">
      <Link
        href={href}
        prefetch={false}
        className={cx(learningLoopCardClassName, theme.borderClassName)}
      >
        <div className="flex items-start justify-between gap-3">
          <IconTile icon={icon} size="sm" tone={tone} />
          <span className="rounded-full border border-line bg-paper/80 px-2.5 py-1 text-xs font-semibold text-muted">
            {stepLabel}
          </span>
        </div>

        <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink md:mt-5 md:text-xl">
          {title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted">
          {description}
        </p>
        <span
          className={cx(
            "mt-5 inline-flex items-center gap-2 text-sm font-semibold",
            theme.linkClassName,
          )}
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  );
}

function PlatformPillarCard({
  description,
  icon,
  links,
  title,
  tone,
}: PlatformPillarCardProps) {
  const theme = TONE_CLASSES[tone];

  return (
    <article className={cx(platformPillarCardClassName, theme.borderClassName)}>
      <IconTile icon={icon} size="sm" tone={tone} />
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted md:text-base md:leading-7 xl:text-sm xl:leading-6">
        {description}
      </p>

      <ul className="mt-5 flex flex-col gap-2 border-t border-line/70 pt-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              prefetch={false}
              className={cx(
                "group/link inline-flex max-w-full items-center gap-2 text-sm font-semibold transition hover:text-ink focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
                theme.linkClassName,
              )}
            >
              <span className="min-w-0 break-words">{link.label}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover/link:translate-x-0.5" />
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

  const learningLoopSteps: LearningLoopStepProps[] = [
    {
      href: dictionaryHref,
      icon: Search,
      stepLabel: "01",
      title: t("home.learningLoop.searchTitle"),
      description: t("home.learningLoop.searchDesc"),
      cta: t("home.learningLoop.searchCta"),
      tone: "coptic",
    },
    {
      href: grammarHref,
      icon: GraduationCap,
      stepLabel: "02",
      title: t("home.learningLoop.learnTitle"),
      description: t("home.learningLoop.learnDesc"),
      cta: t("home.learningLoop.learnCta"),
      tone: "ink",
    },
    {
      href: practiceHref,
      icon: Layers3,
      stepLabel: "03",
      title: t("home.learningLoop.practiceTitle"),
      description: t("home.learningLoop.practiceDesc"),
      cta: t("home.learningLoop.practiceCta"),
      tone: "coptic",
    },
    {
      href: analyticsHref,
      icon: BarChart3,
      stepLabel: "04",
      title: t("home.learningLoop.exploreTitle"),
      description: t("home.learningLoop.exploreDesc"),
      cta: t("home.learningLoop.exploreCta"),
      tone: "gold",
    },
  ];
  const platformPillars: PlatformPillarCardProps[] = [
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
      className="min-h-screen px-4 pb-8 pt-2 sm:px-6 md:pb-10"
      contentClassName="mx-auto w-full max-w-6xl space-y-10 text-center sm:space-y-12 md:space-y-16"
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashInset,
      ]}
    >
      <section className="mx-auto flex max-w-4xl flex-col items-center">
        <div className="relative mb-1 h-36 w-36 transition-transform duration-500 hover:scale-[1.03] sm:h-44 sm:w-44 md:mb-2 md:h-60 md:w-60 lg:h-64 lg:w-64">
          <Image
            src="/logo/Coptic_Compass_Primary.svg"
            alt="Coptic Compass Logo"
            fill
            sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, (max-width: 1024px) 240px, 256px"
            className="object-contain dark:hidden"
            priority
            loading="eager"
          />
          <Image
            src="/logo/Coptic_Compass_Secondary.svg"
            alt="Coptic Compass Logo"
            fill
            sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, (max-width: 1024px) 240px, 256px"
            className="hidden object-contain dark:block"
            priority
            loading="eager"
          />
        </div>

        <PageHeader
          className="[&_h1]:text-4xl [&_p]:text-base [&_p]:leading-7 sm:[&_h1]:text-5xl sm:[&_p]:text-lg md:[&_h1]:text-7xl md:[&_p]:text-xl"
          eyebrow={t("home.eyebrow")}
          eyebrowVariant="badge"
          title={
            <span className="font-coptic font-normal tracking-normal">
              {t("home.title")}
            </span>
          }
          description={t("home.subtitle")}
          size="hero"
          tone="brand"
        />

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={dictionaryHref}
            prefetch={false}
            className={buttonClassName({ size: "lg", variant: "primary" })}
          >
            {t("home.hero.primaryCta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={practiceHref}
            prefetch={false}
            className={buttonClassName({ size: "lg", variant: "secondary" })}
          >
            {t("home.hero.secondaryCta")}
          </Link>
        </div>
      </section>

      <section
        id="mission"
        className="scroll-mt-28 grid gap-4 text-left sm:gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch"
      >
        <div className="rounded-lg border border-line bg-ink p-6 text-paper shadow-panel dark:bg-surface/88 dark:text-ink md:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            {t("home.mission.eyebrow")}
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-paper dark:text-ink md:text-4xl">
            {t("home.mission.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-paper/70 dark:text-muted md:mt-5 md:text-lg md:leading-8">
            {t("home.mission.body")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SurfacePanel shadow="soft" className="p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-strong dark:text-accent">
              {t("home.promise.title")}
            </p>
            <p className="mt-4 leading-7 text-muted">
              {t("home.promise.body")}
            </p>
          </SurfacePanel>
          <SurfacePanel shadow="soft" className="p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-coptic">
              {t("home.audience.title")}
            </p>
            <p className="mt-4 leading-7 text-muted">
              {t("home.audience.body")}
            </p>
          </SurfacePanel>
        </div>
      </section>

      <section className="space-y-8 md:space-y-10">
        <div className="mx-auto max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-coptic">
            {t("home.learningLoop.eyebrow")}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-ink md:text-4xl">
            {t("home.learningLoop.title")}
          </h2>
          <p className="text-base leading-7 text-muted md:text-lg md:leading-8">
            {t("home.learningLoop.desc")}
          </p>
        </div>

        <ol className="grid gap-3 text-left md:grid-cols-2 xl:grid-cols-4">
          {learningLoopSteps.map((step) => (
            <LearningLoopStep key={step.href} {...step} />
          ))}
        </ol>

        <div className="mx-auto max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-strong dark:text-accent">
            {t("home.platform.eyebrow")}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-ink md:text-4xl">
            {t("home.platform.title")}
          </h2>
          <p className="text-base leading-7 text-muted md:text-lg md:leading-8">
            {t("home.platform.desc")}
          </p>
        </div>

        <div className="grid gap-4 text-left md:grid-cols-2 xl:grid-cols-4">
          {platformPillars.map((pillar) => (
            <PlatformPillarCard key={pillar.title} {...pillar} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl text-center">
        <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent-strong dark:text-accent">
          <Compass className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-strong dark:text-accent">
          {t("home.closing.eyebrow")}
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink md:text-4xl">
          {t("home.closing.title")}
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted md:mt-5 md:text-lg md:leading-8">
          {t("home.closing.body")}
        </p>
        <div className="mt-7 flex justify-center">
          <Link
            href={publicationsHref}
            prefetch={false}
            className={buttonClassName({
              size: "md",
              variant: "secondary",
            })}
          >
            {t("home.publications.cta")}
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
