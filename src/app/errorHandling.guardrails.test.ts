import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const SOURCE_ROOT = path.join(process.cwd(), "src");

const TECHNICAL_ENV_COPY_ALLOWLIST = new Set([
  "src/features/api-docs/components/ApiDocsPageClient.tsx",
  "src/features/api-docs/lib/publicOpenApiShared.ts",
  "src/features/developers/components/DevelopersPageClient.tsx",
  "src/lib/translations/developers.ts",
]);

const KNOWN_ENV_VAR_PATTERN =
  /\b(?:GEMINI_API_KEY|HF_TOKEN|NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_URL|OCR_SERVICE_URL|OCR_UPLOAD_FIELD|OPENROUTER_API_KEY|RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY|THOTH_API_KEY)\b/;

type SourceMatch = {
  line: number;
  path: string;
  text: string;
};

function listSourceFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(entryPath));
      continue;
    }

    if (
      SOURCE_EXTENSIONS.has(path.extname(entry.name)) &&
      !entry.name.endsWith(".test.ts")
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

function toProjectPath(absolutePath: string) {
  return path.relative(process.cwd(), absolutePath);
}

function findLineMatches(
  pattern: RegExp,
  options?: { files?: string[] },
): SourceMatch[] {
  const files = options?.files ?? listSourceFiles(SOURCE_ROOT);
  const matches: SourceMatch[] = [];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n");

    lines.forEach((lineText, index) => {
      if (pattern.test(lineText)) {
        matches.push({
          line: index + 1,
          path: toProjectPath(filePath),
          text: lineText.trim(),
        });
      }
    });
  }

  return matches;
}

function expectNoMatches(label: string, matches: SourceMatch[]) {
  expect(
    matches.map((match) => `${match.path}:${match.line} ${match.text}`),
    label,
  ).toEqual([]);
}

describe("error handling source guardrails", () => {
  it("keeps blocking browser alerts out of app code", () => {
    expectNoMatches("Do not use alert() for user-facing errors.", [
      ...findLineMatches(/\balert\s*\(/),
    ]);
  });

  it("flags raw error.message rendering in JSX", () => {
    const componentFiles = listSourceFiles(SOURCE_ROOT).filter((filePath) =>
      filePath.endsWith(".tsx"),
    );

    expectNoMatches(
      "Map errors to public copy before rendering them in JSX.",
      findLineMatches(/\{\s*(?:[a-zA-Z]+Error|error)\.message\s*\}/, {
        files: componentFiles,
      }),
    );
  });

  it("flags raw error.message action return payloads", () => {
    const actionFiles = listSourceFiles(path.join(SOURCE_ROOT, "actions"));

    expectNoMatches(
      "Server actions should return public copy, not error.message.",
      findLineMatches(
        /return\s+\{.*error:\s*(?:[a-zA-Z]+Error|error)\.message/,
        {
          files: actionFiles,
        },
      ),
    );
  });

  it("flags direct payload.error rendering in client UI", () => {
    const componentFiles = listSourceFiles(SOURCE_ROOT).filter((filePath) =>
      filePath.endsWith(".tsx"),
    );

    expectNoMatches(
      "Map payload.error before rendering it directly.",
      findLineMatches(/\{\s*payload\.error\s*\}/, {
        files: componentFiles,
      }),
    );
  });

  it("keeps env var names out of non-technical user-facing copy", () => {
    const userFacingCopyFiles = listSourceFiles(SOURCE_ROOT).filter(
      (filePath) => {
        const projectPath = toProjectPath(filePath);
        return (
          !TECHNICAL_ENV_COPY_ALLOWLIST.has(projectPath) &&
          (projectPath.includes("/components/") ||
            projectPath.includes("/translations/") ||
            projectPath.includes("src/app/(app)/") ||
            projectPath.includes("src/app/(site)/"))
        );
      },
    );

    expectNoMatches(
      "Env var names belong in docs/developer surfaces, not general UI copy.",
      findLineMatches(KNOWN_ENV_VAR_PATTERN, {
        files: userFacingCopyFiles,
      }),
    );
  });
});
