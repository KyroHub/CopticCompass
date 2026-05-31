import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ADMIN_OPERATIONAL_ERROR_UI_FILES = [
  "src/app/(app)/admin/error.tsx",
  "src/features/admin/components/AdminDashboardSections.tsx",
  "src/features/admin/components/AdminRagIngestionForm.tsx",
  "src/features/communications/components/AdminAudienceContactCard.tsx",
  "src/features/communications/components/AdminContentReleaseCard.tsx",
  "src/features/communications/components/CreateContentReleaseForm.tsx",
  "src/features/communications/components/DeleteContentReleaseForm.tsx",
  "src/features/communications/components/SendContentReleaseForm.tsx",
  "src/features/communications/components/SendContentReleasePreviewForm.tsx",
  "src/features/communications/components/SyncAudienceContactsForm.tsx",
  "src/features/notifications/components/AdminNotificationEventCard.tsx",
] as const;

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("admin error disclosure guardrails", () => {
  it("keeps raw database-error prefixes out of admin-facing copy", () => {
    for (const relativePath of ADMIN_OPERATIONAL_ERROR_UI_FILES) {
      const source = readProjectFile(relativePath);

      expect(source, relativePath).not.toMatch(/Database Error:|Databasefout:/);
    }
  });

  it("uses the admin disclosure primitive instead of direct error notices", () => {
    for (const relativePath of ADMIN_OPERATIONAL_ERROR_UI_FILES) {
      const source = readProjectFile(relativePath);

      expect(source, relativePath).not.toMatch(
        /<StatusNotice\b[^>]*tone=["']error["']/,
      );
    }
  });

  it("keeps stored operational failure text behind technical details", () => {
    const technicalDetailRequirements = [
      {
        expected: "technicalDetails={ragStatusError}",
        file: "src/features/admin/components/AdminRagIngestionForm.tsx",
      },
      {
        expected: "technicalDetails={state.error}",
        file: "src/features/admin/components/AdminRagIngestionForm.tsx",
      },
      {
        expected: "technicalDetails={bulkJsonState.error}",
        file: "src/features/admin/components/AdminRagIngestionForm.tsx",
      },
      {
        expected: "technicalDetails={failedBulkJsonResults.map",
        file: "src/features/admin/components/AdminRagIngestionForm.tsx",
      },
      {
        expected: "details={{",
        file: "src/app/(app)/admin/error.tsx",
      },
      {
        expected: "technicalDetails={syncState.last_error}",
        file: "src/features/communications/components/AdminAudienceContactCard.tsx",
      },
      {
        expected: "technicalDetails={release.last_delivery_error}",
        file: "src/features/communications/components/AdminContentReleaseCard.tsx",
      },
      {
        expected: "technicalDetails={event.last_error}",
        file: "src/features/notifications/components/AdminNotificationEventCard.tsx",
      },
    ] as const;

    for (const { expected, file } of technicalDetailRequirements) {
      const source = readProjectFile(file);

      expect(source, `${file} should include ${expected}`).toContain(expected);
    }
  });
});
