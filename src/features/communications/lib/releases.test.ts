import { describe, expect, it } from "vitest";

import { listContentReleaseCandidates } from "./releaseCandidates";
import {
  compareContentReleasePriority,
  deriveContentReleaseType,
  getContentReleaseDeliverySummary,
} from "./releases";

describe("content release helpers", () => {
  it("lists published lesson and publication candidates", () => {
    const candidates = listContentReleaseCandidates();

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "lesson:lesson-1",
          itemId: "lesson-1",
          itemType: "lesson",
          title: "Lesson 01",
          url: "/grammar/lesson-1",
        }),
        expect.objectContaining({
          id: "publication:holy-bible-coptic",
          itemId: "holy-bible-coptic",
          itemType: "publication",
        }),
      ]),
    );
  });

  it("derives mixed release types when both content kinds are present", () => {
    expect(deriveContentReleaseType(["lesson", "publication"])).toBe("mixed");
  });

  it("prioritizes editable drafts ahead of sent releases", () => {
    const left = {
      items: [],
      status: "queued",
      updated_at: "2026-03-28T10:00:00.000Z",
    } as unknown as Parameters<typeof compareContentReleasePriority>[0];
    const right = {
      items: [],
      status: "sent",
      updated_at: "2026-03-28T12:00:00.000Z",
    } as unknown as Parameters<typeof compareContentReleasePriority>[1];

    expect(compareContentReleasePriority(left, right)).toBeLessThan(0);
  });

  it("reads delivery counts from saved release summary json", () => {
    expect(
      getContentReleaseDeliverySummary({
        delivery_summary: {
          eligible_recipient_count: 12,
          failed_count: 1,
          processed_recipient_count: 12,
          remaining_recipient_count: 0,
          sent_count: 10,
          skipped_count: 1,
        },
      }),
    ).toEqual({
      eligibleRecipientCount: 12,
      failedCount: 1,
      processedRecipientCount: 12,
      remainingRecipientCount: 0,
      sentCount: 10,
      skippedCount: 1,
    });
  });
});
