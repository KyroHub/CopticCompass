import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function projectFileExists(relativePath: string) {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

const delegatedRouteContracts = [
  {
    expectedImports: ["@/features/shenute/lib/server/chatRoute"],
    forbiddenImports: [
      "@/lib/copticTranslator",
      "@/lib/gemini",
      "@/lib/hf",
      "@/lib/openrouter",
      "@/lib/thoth",
    ],
    route: "src/app/api/shenute/route.ts",
  },
  {
    expectedImports: ["@/features/shenute/lib/server/historyRoute"],
    route: "src/app/api/shenute/history/route.ts",
  },
  {
    expectedImports: ["@/features/shenute/lib/server/feedbackRoute"],
    forbiddenImports: ["@/lib/rag"],
    route: "src/app/api/shenute/feedback/route.ts",
  },
  {
    expectedImports: ["@/features/admin/lib/server/ragIngestRoute"],
    route: "src/app/api/admin/rag/ingest/route.ts",
  },
  {
    expectedImports: ["@/features/admin/lib/server/ragStatusRoute"],
    route: "src/app/api/admin/rag/status/route.ts",
  },
  {
    expectedImports: ["@/features/admin/lib/server/ragLogsRoute"],
    route: "src/app/api/admin/rag/logs/route.ts",
  },
  {
    expectedImports: ["@/features/admin/lib/server/ragJsonSourcesRoute"],
    route: "src/app/api/admin/rag/ingest-json-sources/route.ts",
  },
] as const;

const retiredFeatureModulePaths = [
  "src/components/FloatingAiAssistant.tsx",
  "src/components/FloatingAiAssistantPanel.tsx",
  "src/features/shenute/components/FloatingAiAssistant.tsx",
  "src/features/shenute/components/FloatingAiAssistantPanel.tsx",
  "src/lib/communications/audience.ts",
  "src/lib/communications/optInRequests.ts",
  "src/lib/communications/resend.ts",
  "src/lib/rag/shenuteFeedbackIngestion.ts",
] as const;

const featureOwnedModules = [
  "src/features/communications/lib/server/audience.ts",
  "src/features/communications/lib/server/optInRequests.ts",
  "src/features/communications/lib/server/resend.ts",
  "src/features/shenute/components/FloatingShenute.tsx",
  "src/features/shenute/components/FloatingShenutePanel.tsx",
  "src/features/shenute/lib/server/feedbackIngestion.ts",
] as const;

const privilegedServerOnlyModules = [
  "src/features/admin/lib/ragChunking.ts",
  "src/features/admin/lib/ragEmbeddings.ts",
  "src/features/admin/lib/ragIngestion.ts",
  "src/features/admin/lib/ragIngestionConfig.ts",
  "src/features/admin/lib/ragIngestionLogging.ts",
  "src/features/admin/lib/ragIngestionUtils.ts",
  "src/features/admin/lib/ragJsonSourceIngestion.ts",
  "src/features/admin/lib/ragOcrReconciliation.ts",
  "src/features/admin/lib/ragPersistence.ts",
  "src/features/admin/lib/ragSourceReaders.ts",
  "src/features/admin/lib/server/ragIngestRoute.ts",
  "src/features/admin/lib/server/ragJsonSourcesRoute.ts",
  "src/features/admin/lib/server/ragLogsRoute.ts",
  "src/features/admin/lib/server/ragStatusRoute.ts",
  "src/features/communications/lib/server/audience.ts",
  "src/features/communications/lib/server/optInRequests.ts",
  "src/features/communications/lib/server/resend.ts",
  "src/features/shenute/lib/server/feedbackIngestion.ts",
  "src/features/shenute/lib/server/retrieval.ts",
  "src/lib/notifications/config.ts",
  "src/lib/notifications/email.ts",
  "src/lib/notifications/events.ts",
  "src/lib/server/ocrProtection.ts",
  "src/lib/server/ocrService.ts",
  "src/lib/supabase/functions.ts",
  "src/lib/supabase/serviceRole.ts",
] as const;

describe("Coptic Compass architecture guardrails", () => {
  it("keeps extracted API route handlers delegated to feature-owned server modules", () => {
    for (const contract of delegatedRouteContracts) {
      const source = readProjectFile(contract.route);

      for (const expectedImport of contract.expectedImports) {
        expect(source, contract.route).toContain(expectedImport);
      }

      const forbiddenImports =
        "forbiddenImports" in contract ? contract.forbiddenImports : [];

      for (const forbiddenImport of forbiddenImports) {
        expect(source, contract.route).not.toContain(forbiddenImport);
      }
    }
  });

  it("keeps retired feature-specific module paths absent", () => {
    for (const relativePath of retiredFeatureModulePaths) {
      expect(projectFileExists(relativePath), relativePath).toBe(false);
    }
  });

  it("keeps feature-owned replacements in their feature folders", () => {
    for (const relativePath of featureOwnedModules) {
      expect(projectFileExists(relativePath), relativePath).toBe(true);
    }
  });

  it("marks privileged server modules as server-only", () => {
    for (const relativePath of privilegedServerOnlyModules) {
      const source = readProjectFile(relativePath);

      expect(source, relativePath).toContain('import "server-only";');
    }
  });
});
