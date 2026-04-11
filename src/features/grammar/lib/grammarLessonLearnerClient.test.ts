import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getLessonCompletionTimestamp,
  removeSectionProgressRow,
  resolveGrammarLessonPersistenceError,
  upsertSectionProgressRow,
} from "./grammarLessonLearnerClient";

describe("grammar lesson learner client helpers", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("keeps the original completion timestamp for fully completed lessons", () => {
    expect(
      getLessonCompletionTimestamp({
        completedSections: 3,
        currentCompletedAt: "2025-01-02T03:04:05.000Z",
        totalSections: 3,
      }),
    ).toBe("2025-01-02T03:04:05.000Z");
  });

  it("creates a completion timestamp when the final section is completed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-07T08:09:10.000Z"));

    expect(
      getLessonCompletionTimestamp({
        completedSections: 4,
        currentCompletedAt: null,
        totalSections: 4,
      }),
    ).toBe("2025-06-07T08:09:10.000Z");
  });

  it("clears the completion timestamp when a lesson is no longer fully completed", () => {
    expect(
      getLessonCompletionTimestamp({
        completedSections: 2,
        currentCompletedAt: "2025-01-02T03:04:05.000Z",
        totalSections: 3,
      }),
    ).toBeNull();
  });

  it("replaces a section row with the latest persisted row", () => {
    const rows = [
      {
        completed_at: "2025-01-01T00:00:00.000Z",
        lesson_id: "lesson-1",
        lesson_slug: "lesson-1",
        section_id: "section-1",
        section_slug: "section-1",
        user_id: "user-1",
      },
      {
        completed_at: "2025-01-01T00:00:00.000Z",
        lesson_id: "lesson-1",
        lesson_slug: "lesson-1",
        section_id: "section-2",
        section_slug: "section-2",
        user_id: "user-1",
      },
    ];

    expect(
      upsertSectionProgressRow(rows, {
        completed_at: "2025-02-01T00:00:00.000Z",
        lesson_id: "lesson-1",
        lesson_slug: "lesson-1",
        section_id: "section-2",
        section_slug: "section-2",
        user_id: "user-1",
      }),
    ).toEqual([
      rows[0],
      {
        completed_at: "2025-02-01T00:00:00.000Z",
        lesson_id: "lesson-1",
        lesson_slug: "lesson-1",
        section_id: "section-2",
        section_slug: "section-2",
        user_id: "user-1",
      },
    ]);
  });

  it("removes a completed section row by section id", () => {
    expect(
      removeSectionProgressRow(
        [
          {
            completed_at: "2025-01-01T00:00:00.000Z",
            lesson_id: "lesson-1",
            lesson_slug: "lesson-1",
            section_id: "section-1",
            section_slug: "section-1",
            user_id: "user-1",
          },
          {
            completed_at: "2025-01-01T00:00:00.000Z",
            lesson_id: "lesson-1",
            lesson_slug: "lesson-1",
            section_id: "section-2",
            section_slug: "section-2",
            user_id: "user-1",
          },
        ],
        "section-1",
      ),
    ).toEqual([
      {
        completed_at: "2025-01-01T00:00:00.000Z",
        lesson_id: "lesson-1",
        lesson_slug: "lesson-1",
        section_id: "section-2",
        section_slug: "section-2",
        user_id: "user-1",
      },
    ]);
  });

  it("flags missing-table errors as unavailable storage", () => {
    expect(
      resolveGrammarLessonPersistenceError(
        { code: "42P01", message: "relation does not exist" },
        "fallback message",
      ),
    ).toEqual({
      errorMessage: null,
      isUnavailable: true,
    });
  });

  it("keeps user-facing fallback messages for ordinary failures", () => {
    expect(
      resolveGrammarLessonPersistenceError(
        { code: "500", message: "boom" },
        "fallback message",
      ),
    ).toEqual({
      errorMessage: "fallback message",
      isUnavailable: false,
    });
  });
});
