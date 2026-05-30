"use client";

import {
  BrainCircuit,
  ExternalLink,
  LibraryBig,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { AppPageIntro } from "@/components/AppPageIntro";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SurfacePanel } from "@/components/SurfacePanel";
import { getContactPath, getLocalizedHomePath } from "@/lib/locale";

type ContributorContact = {
  href: string;
  label: string;
  external?: boolean;
};

export function ContributorsPageClient() {
  const { t, language } = useLanguage();

  const founder = {
    name: t("contributors.person.kyrillos.name"),
    role: t("contributors.person.kyrillos.role"),
    description: t("contributors.person.kyrillos.description"),
    contacts: [
      {
        href: "https://www.copticcompass.com",
        label: "Website",
        external: true,
      },
      {
        href: "https://github.com/KyroHub",
        label: "GitHub",
        external: true,
      },
      {
        href: "/", // Handled specially below
        label: language === "nl" ? "Contactpagina" : "Contact page",
      },
    ],
  };

  const contributors = [
    {
      name: t("contributors.person.george.name"),
      role: t("contributors.person.george.role"),
      description: t("contributors.person.george.description"),
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
      name: t("contributors.person.so.name"),
      role: t("contributors.person.so.role"),
      description: t("contributors.person.so.description"),
      contacts: [
        {
          href: "mailto:miyagawa.so.kb@u.tsukuba.ac.jp",
          label: "miyagawa.so.kb@u.tsukuba.ac.jp",
        },
        {
          href: "https://somiyagawa.github.io/THOTH.AI/",
          label: "THOTH AI",
          external: true,
        },
      ],
    },
  ];

  const shenuteCredits = {
    title: t("contributors.shenuteCredits.title"),
    description: t("contributors.shenuteCredits.description"),
    sections: [
      {
        title: "Credits",
        items: [
          "Dr. So Miyagawa",
          language === "nl"
            ? "Hoofddocent taalkunde en egyptologie, University of Tsukuba"
            : "Associate Professor of Linguistics and Egyptology, University of Tsukuba",
          language === "nl"
            ? "Dr. Miyagawa specialiseert zich in de Oudegyptisch-Koptische taal. Na promotieonderzoek aan het Seminar for Egyptology and Coptic Studies van de University of Gottingen combineert zijn werk computationele taalkundige methoden met traditionele filologische benaderingen."
            : "Dr. Miyagawa specializes in the Ancient Egyptian-Coptic language. Following doctoral research at the University of Gottingen's Seminar for Egyptology and Coptic Studies, his work integrates computational linguistic methods with traditional philological approaches.",
          language === "nl"
            ? "Zijn onderzoek richt zich op oude en middeleeuwse talen van de Nijlvallei, waaronder Oudegyptisch-Koptisch, Oudnubisch, Grieks, Arabisch en Meroitisch, naast bedreigde talen in en rond de Japanse archipel."
            : "His research focuses on ancient and medieval Nile Valley languages, including Ancient Egyptian-Coptic, Old Nubian, Greek, Arabic, and Meroitic, as well as endangered languages in and around the Japanese Archipelago.",
        ],
        links: [
          {
            href: "mailto:miyagawa.so.kb@u.tsukuba.ac.jp",
            label: "Contact: miyagawa.so.kb@u.tsukuba.ac.jp",
          },
        ],
      },
      {
        title: language === "nl" ? "Basistechnologie" : "Base technology",
        items: [
          "Platform: Dify",
          language === "nl"
            ? "Basis-LLM: Claude 4.5 Sonnet (upgrade vanaf 3.5)"
            : "Base LLM: Claude 4.5 Sonnet (upgraded from 3.5)",
          "Architecture: RAG (Retrieval Augmented Generation)",
          language === "nl"
            ? "Mogelijkheden voor natuurlijke-taalverwerking en OCR"
            : "Natural Language Processing and OCR capabilities",
        ],
      },
      {
        title: language === "nl" ? "Kennisbank" : "Knowledge base",
        items: [
          "Comprehensive Coptic Lexicon v1.2 (2020)",
          "Burns, D., Feder, F., John, K., Kupreyev, M., et al.",
          "Freie Universitat Berlin",
          "A Concise Dictionary of Middle Egyptian (1962)",
          "Raymond Oliver Faulkner",
          "Griffith Institute, Oxford",
          language === "nl"
            ? "Aangepaste instructieprompts (meer dan 500 regels)"
            : "Custom instruction prompts (500 plus lines)",
        ],
      },
    ],
    links: [
      {
        href: "https://somiyagawa.github.io/THOTH.AI/",
        label: t("contributors.shenuteCredits.link.thoth"),
      },
    ],
  };

  const researchCredits = {
    title: t("contributors.researchCredits.title"),
    description: t("contributors.researchCredits.description"),
    items: [
      {
        label: "CopticTranslator.com",
        href: "https://www.coptictranslator.com/",
        description:
          language === "nl"
            ? "Primair platform voor Koptisch-Engelse vertaaldiensten."
            : "Primary platform for Coptic-English translation services.",
      },
      {
        label: "NMT Paper (PDF)",
        href: "https://www.coptictranslator.com/paper.pdf",
        description:
          language === "nl"
            ? "Technische details van de onderliggende seq2seq-architectuur."
            : "Technical details of the underlying seq2seq architecture.",
      },
      {
        label: "arXiv:2404.13813",
        href: "https://arxiv.org/abs/2404.13813",
        description:
          language === "nl"
            ? "Peer-reviewed onderzoek naar Koptische NMT-datasets en -modellen."
            : "Peer-reviewed research on Coptic NMT datasets and models.",
      },
    ],
  };

  const contactLinkClassName =
    "underline decoration-accent/45 underline-offset-4 transition-colors hover:text-ink dark:decoration-accent/55";

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
        <Link href={getContactPath(language)} className={contactLinkClassName}>
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

  const renderCreditLink = (link: { href: string; label: string }) => {
    if (link.href.startsWith("mailto:")) {
      return (
        <a href={link.href} className={contactLinkClassName}>
          {link.label}
        </a>
      );
    }

    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-strong transition-colors hover:text-ink dark:text-accent"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {link.label}
      </a>
    );
  };

  const shenuteCreditSectionIcons = [UserRound, BrainCircuit, LibraryBig];

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content"
      width="standard"
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashInset,
      ]}
    >
      <AppPageIntro
        align="center"
        breadcrumbs={[
          {
            label: t("nav.home"),
            href: getLocalizedHomePath(language),
          },
          { label: t("contributors.breadcrumbLabel") },
        ]}
        title={t("contributors.title")}
        description={t("contributors.subtitle")}
        tone="coptic"
      />

      <div className="space-y-8 md:space-y-9">
        <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {language === "nl" ? "Oprichter" : "Founder"}
          </p>

          <div className="mt-5">
            <article className="rounded-lg border border-line bg-elevated/60 p-5">
              <h2 className="text-xl font-semibold text-ink">{founder.name}</h2>
              <p className="mt-1 text-sm font-medium text-coptic">
                {founder.role}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                {founder.description}
              </p>

              {founder.contacts.length > 0 ? (
                <>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {t("contributors.contactsHeading")}
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-ink">
                    {founder.contacts.map((contact) => (
                      <li key={`${founder.name}-${contact.href}`}>
                        {renderContributorContact(contact)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </article>
          </div>
        </SurfacePanel>

        <SurfacePanel rounded="lg" variant="elevated" className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {t("contributors.sectionTitle")}
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {contributors.map((contributor) => (
              <article
                key={contributor.name}
                className="rounded-lg border border-line bg-elevated/60 p-5"
              >
                <h2 className="text-xl font-semibold text-ink">
                  {contributor.name}
                </h2>
                <p className="mt-1 text-sm font-medium text-coptic">
                  {contributor.role}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {contributor.description}
                </p>

                {contributor.contacts.length > 0 ? (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      {t("contributors.contactsHeading")}
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-ink">
                      {contributor.contacts.map((contact) => (
                        <li key={`${contributor.name}-${contact.href}`}>
                          {renderContributorContact(contact)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </article>
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel
          as="section"
          id="shenute-ai-credits"
          rounded="lg"
          variant="elevated"
          className="scroll-mt-28 p-6 md:p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {shenuteCredits.title}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            {shenuteCredits.description}
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {shenuteCredits.sections.map((section, index) => {
              const Icon = shenuteCreditSectionIcons[index] ?? BrainCircuit;

              return (
                <article
                  key={section.title}
                  className="rounded-lg border border-line bg-elevated/60 p-5"
                >
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                    <Icon className="h-4 w-4 text-coptic" />
                    <h2>{section.title}</h2>
                  </div>
                  <ul className="space-y-2 text-sm leading-6 text-muted">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  {section.links ? (
                    <div className="mt-4 space-y-2 text-sm">
                      {section.links.map((link) => (
                        <div key={link.href}>{renderCreditLink(link)}</div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <div className="flex flex-wrap gap-3">
              {shenuteCredits.links.map((link) => (
                <div key={link.href}>{renderCreditLink(link)}</div>
              ))}
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel
          as="section"
          id="research-nmt-credits"
          rounded="lg"
          variant="elevated"
          className="scroll-mt-28 p-6 md:p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {researchCredits.title}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            {researchCredits.description}
          </p>

          <div className="mt-6 space-y-4">
            {researchCredits.items.map((item) => (
              <div key={item.href} className="group flex flex-col space-y-1">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-accent-strong transition-colors hover:text-ink dark:text-accent"
                >
                  {item.label} →
                </a>
                <p className="text-xs italic text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </SurfacePanel>
      </div>
    </PageShell>
  );
}
