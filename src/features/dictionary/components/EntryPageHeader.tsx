"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { getDictionaryPath, getLocalizedHomePath } from "@/lib/locale";

type EntryPageHeaderProps = {
  entryLabel: string;
};

export default function EntryPageHeader({ entryLabel }: EntryPageHeaderProps) {
  const { language, t } = useLanguage();

  return (
    <div className="mb-8 space-y-4">
      <BreadcrumbTrail
        items={[
          { label: t("nav.home"), href: getLocalizedHomePath(language) },
          { label: t("nav.dictionary"), href: getDictionaryPath(language) },
          { label: entryLabel, labelClassName: "font-coptic" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={getDictionaryPath(language)}
          className={buttonClassName({
            className: "gap-2 px-4",
            variant: "secondary",
          })}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("entry.back")}
        </Link>
      </div>
    </div>
  );
}
