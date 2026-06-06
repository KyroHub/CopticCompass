import { describe, expect, it } from "vitest";

import {
  getShenuteFeedbackFailureMessage,
  getShenuteFeedbackSuccessMessage,
  type ShenuteFeedbackSubmissionCopy,
} from "./useShenuteFeedbackSubmission";

const copy = {
  promptMissing: "Prompt missing.",
  saveFailed: "Could not save feedback.",
  saved: "Saved.",
  savedLearningDelayed: "Saved. Learning delayed.",
  savedWithRag: "Saved with RAG.",
  saving: "Saving...",
  signIn: "Sign in.",
  writeAdminFeedback: "Write feedback.",
} satisfies ShenuteFeedbackSubmissionCopy;

describe("Shenute feedback submission helpers", () => {
  it("uses public feedback copy for structured route errors", () => {
    expect(
      getShenuteFeedbackFailureMessage(
        { code: "validation_failed", success: false },
        copy.saveFailed,
        "en",
      ),
    ).toBe("Could not read this feedback. Please try again.");
  });

  it("falls back to the surface copy for unstructured route errors", () => {
    expect(
      getShenuteFeedbackFailureMessage(
        { code: "not_an_app_code", success: false },
        copy.saveFailed,
        "en",
      ),
    ).toBe(copy.saveFailed);
  });

  it("prioritizes RAG ingestion success copy over warning copy", () => {
    expect(
      getShenuteFeedbackSuccessMessage(
        { ragIngested: true, ragWarning: true, success: true },
        copy,
      ),
    ).toBe(copy.savedWithRag);
  });

  it("uses delayed learning copy for successful saves with RAG warnings", () => {
    expect(
      getShenuteFeedbackSuccessMessage(
        { ragWarning: true, success: true },
        copy,
      ),
    ).toBe(copy.savedLearningDelayed);
  });

  it("uses default saved copy for ordinary successful saves", () => {
    expect(getShenuteFeedbackSuccessMessage({ success: true }, copy)).toBe(
      copy.saved,
    );
  });
});
