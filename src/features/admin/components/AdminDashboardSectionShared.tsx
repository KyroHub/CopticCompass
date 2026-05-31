import { AdminErrorDisclosure } from "@/features/admin/components/AdminErrorDisclosure";
import type { Language } from "@/types/i18n";

type SectionSummaryLabels = {
  active: string;
  none: string;
  plural: string;
  singular: string;
  total: string;
};

export function formatAdminNumber(value: number, language: Language) {
  return value.toLocaleString(language === "nl" ? "nl-BE" : "en-US");
}

export function AdminDatabaseErrorState({
  details,
  language,
  message,
}: {
  details: unknown;
  language: Language;
  message: string;
}) {
  return (
    <AdminErrorDisclosure
      className="p-5"
      language={language}
      message={message}
      technicalDetails={details}
    />
  );
}

export function buildSectionSummary({
  active,
  labels,
  language,
  total,
}: {
  active: number;
  labels: SectionSummaryLabels;
  language: Language;
  total: number;
}) {
  if (total === 0) {
    return labels.none;
  }

  if (active <= 0) {
    return `${formatAdminNumber(total, language)} ${
      total === 1 ? labels.singular : labels.plural
    }`;
  }

  return `${formatAdminNumber(active, language)} ${labels.active} · ${formatAdminNumber(total, language)} ${labels.total}`;
}
