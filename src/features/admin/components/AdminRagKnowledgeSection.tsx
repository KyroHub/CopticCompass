import { AdminPersistentSection } from "@/features/admin/components/AdminPersistentSection";
import { AdminRagIngestionForm } from "@/features/admin/components/AdminRagIngestionForm";
import type { Language } from "@/types/i18n";

import { adminDashboardSectionsCopy } from "./adminDashboardSectionsCopy";

export function AdminRagKnowledgeSection({ language }: { language: Language }) {
  const copy = adminDashboardSectionsCopy[language].rag;

  return (
    <AdminPersistentSection
      id="admin-rag-knowledge"
      title={copy.title}
      description={copy.description}
      summary={copy.summary}
      defaultOpen
    >
      <AdminRagIngestionForm />
    </AdminPersistentSection>
  );
}
