import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx,mts}", "supabase/functions/**/*.ts"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
          disallowTypeAnnotations: false,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "import/first": "error",
      "import/no-duplicates": "error",
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/*.test.{ts,tsx,mts}",
            "**/*.test-helpers.{ts,tsx,mts}",
          ],
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
      "import/no-unresolved": [
        "error",
        {
          caseSensitive: true,
          ignore: ["^@/", "^@supabase-shared/"],
        },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-else-return": "error",
      "no-nested-ternary": "error",
      "no-unneeded-ternary": "error",
      "prefer-template": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx,mts}"],
    ignores: ["src/**/*.test.ts", "src/content/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../../*", "../../../../*", "../../../../../*"],
              message:
                "Prefer @/ aliases or feature-local imports over deep parent-relative paths.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx,mts}", "supabase/functions/**/*.ts"],
    rules: {
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
            "type",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@supabase-shared/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
        },
      ],
    },
  },
  {
    files: ["src/actions/**/*.{ts,tsx,mts}"],
    ignores: ["src/**/*.test.ts", "src/**/*.test-helpers.ts"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": [
        "warn",
        {
          allowArgumentsExplicitlyTypedAsAny: true,
        },
      ],
    },
  },
  {
    files: [
      "src/actions/**/*.{ts,tsx,mts}",
      "src/lib/**/*.{ts,tsx,mts}",
      "supabase/functions/**/*.ts",
    ],
    ignores: ["src/**/*.test.ts", "src/**/*.test-helpers.ts"],
    rules: {
      complexity: ["warn", 10],
      "max-depth": ["warn", 3],
      "max-lines-per-function": [
        "warn",
        {
          max: 80,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-nested-callbacks": ["warn", 2],
    },
  },
  /**
   * Preserve Next's default generated-file ignores and extend them with the
   * artifacts created by test and coverage tooling.
   */
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".vercel/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
