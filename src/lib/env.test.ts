import { describe, expect, it } from "vitest";

import { hasEnvValue, readBooleanEnv, readNumberEnv } from "./env";

describe("environment parsing primitives", () => {
  it("reads numeric env values with the provided default", () => {
    expect(readNumberEnv({}, "RAG_INSERT_BATCH_SIZE", 50)).toBe(50);
    expect(
      readNumberEnv(
        { RAG_INSERT_BATCH_SIZE: "25" },
        "RAG_INSERT_BATCH_SIZE",
        50,
      ),
    ).toBe(25);
  });

  it("preserves JavaScript Number semantics for explicit env values", () => {
    expect(readNumberEnv({ VALUE: "" }, "VALUE", 32)).toBe(0);
    expect(
      Number.isNaN(readNumberEnv({ VALUE: "not-a-number" }, "VALUE", 32)),
    ).toBe(true);
  });

  it("reads boolean env values while preserving default-true flag semantics", () => {
    expect(readBooleanEnv({}, "RAG_THOTH_ENABLED", true)).toBe(true);
    expect(
      readBooleanEnv({ RAG_THOTH_ENABLED: "false" }, "RAG_THOTH_ENABLED", true),
    ).toBe(false);
    expect(
      readBooleanEnv({ RAG_THOTH_ENABLED: "" }, "RAG_THOTH_ENABLED", true),
    ).toBe(true);
  });

  it("reads default-false boolean flags", () => {
    expect(readBooleanEnv({}, "FEATURE_ENABLED", false)).toBe(false);
    expect(
      readBooleanEnv({ FEATURE_ENABLED: "true" }, "FEATURE_ENABLED", false),
    ).toBe(true);
    expect(
      readBooleanEnv({ FEATURE_ENABLED: "1" }, "FEATURE_ENABLED", false),
    ).toBe(false);
  });

  it("checks whether an env value is present", () => {
    expect(hasEnvValue({}, "THOTH_API_KEY")).toBe(false);
    expect(hasEnvValue({ THOTH_API_KEY: "" }, "THOTH_API_KEY")).toBe(false);
    expect(hasEnvValue({ THOTH_API_KEY: "token" }, "THOTH_API_KEY")).toBe(true);
  });
});
