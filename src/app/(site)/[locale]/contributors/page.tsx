import Link from "next/link";

import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import StructuredData from "@/components/StructuredData";
import { SurfacePanel } from "@/components/SurfacePanel";
import { getTranslation } from "@/lib/i18n";
import {
  getContactPath,
  getContributorsPath,
  getLocalizedHomePath,
} from "@/lib/locale";
import { createLocalizedPageMetadata } from "@/lib/metadata";
import { resolvePublicLocale } from "@/lib/publicLocaleRouting";
import { createBreadcrumbStructuredData } from "@/lib/structuredData";

import type { Metadata } from "next";

type ContributorContact = {
  href: string;
  label: string;
  external?: boolean;
};

type ContributorCard = {
  description: string;
  name: string;
  role: string;
  contacts: readonly ContributorContact[];
};

const contributorsCopy = {
  en: {
    seoTitle: "Contributors",
    description:
      "Meet the contributors behind Coptic Compass, including George Joseph Basilious Tawadrous and Kyrillos Wannes.",
    eyebrow: "Project Team",
    title: "Contributors",
    subtitle:
      "Coptic Compass is shaped by contributors focused on Coptic language learning, AI-assisted workflows, and high-quality educational tooling.",
    sectionTitle: "Core contributors",
    breadcrumbLabel: "Contributors",
    contactsHeading: "Contact links",
    contributors: [
      {
        name: "George Joseph Basilious Tawadrous",
        role: "Contributor",
        description:
          "Supports the project with engineering collaboration and practical product feedback for Coptic learning workflows.",
        contacts: [
          {
            href: "mailto:georgtawadrous@gmail.com",
            label: "georgtawadrous@gmail.com",
          },
          {
            href: "https://www.linkedin.com/in/the3miaphysite3engineer3/",
            label: "LinkedIn",
            external: true,
          },
          {
            href: "https://github.com/the3miaphysite3engineer3",
            label: "GitHub",
            external: true,
          },
          {
            href: "https://georgetawadrousportfolio.web.app",
            label: "Portfolio",
            external: true,
          },
        ],
      },
      {
        name: "Kyrillos Wannes",
        role: "Founder and Lead Developer",
        description:
          "Builds and maintains Coptic Compass, including the dictionary, grammar platform, and Shenute AI integrations.",
        contacts: [
          {
            href: "https://kyrilloswannes.com",
            label: "Website",
            external: true,
          },
          {
            href: "https://github.com/KyroHub",
            label: "GitHub",
            external: true,
          },
          {
            href: "/contact",
            label: "Contact page",
          },
        ],
      },
    ] satisfies readonly ContributorCard[],
  },
  nl: {
    seoTitle: "Contributors",
    description:
      "Maak kennis met de contributors achter Coptic Compass, inclusief George Joseph Basilious Tawadrous en Kyrillos Wannes.",
    eyebrow: "Projectteam",
    title: "Contributors",
    subtitle:
      "Coptic Compass wordt gevormd door contributors die zich richten op Koptisch taalonderwijs, AI-ondersteunde workflows en educatieve tools van hoge kwaliteit.",
    sectionTitle: "Kerncontributors",
    breadcrumbLabel: "Contributors",
    contactsHeading: "Contactlinks",
    contributors: [
      {
        name: "George Joseph Basilious Tawadrous",
        role: "Contributor",
        description:
          "Ondersteunt het project met technische samenwerking en praktische productfeedback voor Koptische leerworkflows.",
        contacts: [
          {
            href: "mailto:georgtawadrous@gmail.com",
            label: "georgtawadrous@gmail.com",
          },
          {
            href: "https://www.linkedin.com/in/the3miaphysite3engineer3/",
            label: "LinkedIn",
            external: true,
          },
          {
            href: "https://github.com/the3miaphysite3engineer3",
            label: "GitHub",
            external: true,
          },
          {
            href: "https://georgetawadrousportfolio.web.app",
            label: "Portfolio",
            external: true,
          },
        ],
      },
      {
        name: "Kyrillos Wannes",
        role: "Oprichter en hoofdontwikkelaar",
        description:
          "Bouwt en onderhoudt Coptic Compass, inclusief het woordenboek, het grammaticaplatform en Shenute AI-integraties.",
        contacts: [
          {
            href: "https://kyrilloswannes.com",
            label: "Website",
            external: true,
          },
          {
            href: "https://github.com/KyroHub",
            label: "GitHub",
            external: true,
          },
          {
            href: "/contact",
            label: "Contactpagina",
          },
        ],
      },
    ] satisfies readonly ContributorCard[],
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  const copy = contributorsCopy[resolvedLocale];

  return createLocalizedPageMetadata({
    title: copy.seoTitle,
    description: copy.description,
    path: "/contributors",
    locale: resolvedLocale,
  });
}

/**
 * Renders the localized contributors page with project collaborators and links.
 */
export default async function ContributorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const resolvedLocale = resolvePublicLocale(locale);
  const copy = contributorsCopy[resolvedLocale];
  const contactLinkClassName =
    "underline decoration-sky-400 underline-offset-4 hover:text-sky-700 dark:hover:text-sky-300";

  const renderContributorContact = (contact: ContributorContact) => {
    if (contact.external) {
      return (
        <a
          href={contact.href}
          target="_blank"
          rel="noreferrer"
          className={contactLinkClassName}
        >
          {contact.label}
        </a>
      );
    }

    if (contact.href.startsWith("/")) {
      return (
        <Link
          href={getContactPath(resolvedLocale)}
          className={contactLinkClassName}
        >
          {contact.label}
        </Link>
      );
    }

    return (
      <a href={contact.href} className={contactLinkClassName}>
        {contact.label}
      </a>
    );
  };

  return (
    <PageShell
      className="min-h-screen flex flex-col items-center p-6 md:p-10"
      contentClassName="w-full space-y-8 pt-10"
      width="standard"
      accents={[
        pageShellAccents.topRightSkyOrb,
        pageShellAccents.bottomLeftEmeraldOrbSoft,
      ]}
    >
      <StructuredData
        data={createBreadcrumbStructuredData([
          {
            name: getTranslation(resolvedLocale, "nav.home"),
            path: getLocalizedHomePath(resolvedLocale),
          },
          {
            name: copy.breadcrumbLabel,
            path: getContributorsPath(resolvedLocale),
          },
        ])}
      />

      <BreadcrumbTrail
        items={[
          {
            label: getTranslation(resolvedLocale, "nav.home"),
            href: getLocalizedHomePath(resolvedLocale),
          },
          { label: copy.breadcrumbLabel },
        ]}
      />

      <PageHeader
        eyebrow={copy.eyebrow}
        eyebrowVariant="badge"
        title={copy.title}
        description={copy.subtitle}
        tone="sky"
        size="compact"
      />

      <SurfacePanel rounded="3xl" variant="elevated" className="p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
          {copy.sectionTitle}
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {copy.contributors.map((contributor) => (
            <article
              key={contributor.name}
              className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-5 dark:border-stone-800/80 dark:bg-stone-950/50"
            >
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
                {contributor.name}
              </h2>
              <p className="mt-1 text-sm font-medium text-sky-700 dark:text-sky-300">
                {contributor.role}
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300">
                {contributor.description}
              </p>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                {copy.contactsHeading}
              </p>
              <ul className="mt-2 space-y-2 text-sm text-stone-700 dark:text-stone-200">
                {contributor.contacts.map((contact) => (
                  <li key={`${contributor.name}-${contact.href}`}>
                    {renderContributorContact(contact)}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SurfacePanel>
    </PageShell>
  );
}
