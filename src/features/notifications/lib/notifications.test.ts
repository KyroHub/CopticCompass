import { describe, expect, it } from "vitest";

import {
  compareAdminNotificationPriority,
  formatNotificationAggregateType,
  formatNotificationEventType,
  getNotificationContextBadges,
  isNotificationFailureStatus,
  isNotificationHistoryStatus,
  isNotificationInFlightStatus,
  type AdminNotificationEvent,
} from "./notifications";

function createNotificationEvent(
  overrides?: Partial<AdminNotificationEvent>,
): AdminNotificationEvent {
  return {
    aggregate_id: "aggregate_123",
    aggregate_type: "submission",
    channel: "email",
    created_at: "2026-03-28T10:00:00.000Z",
    dedupe_key: null,
    deliveries: [],
    event_type: "exercise_submission_received",
    id: "event_123",
    last_error: null,
    latestDelivery: null,
    payload: {
      exercise_id: "grammar.exercise.lesson01.001",
      lesson_slug: "lesson-1",
      submitted_language: "nl",
    },
    processed_at: "2026-03-28T10:00:01.000Z",
    recipient: "owner@example.com",
    status: "sent",
    subject: "Coptic Compass exercise submission: lesson 1",
    ...overrides,
  };
}

describe("notification formatting helpers", () => {
  it("prioritizes failure and in-flight states ahead of delivery history", () => {
    const failed = createNotificationEvent({ status: "dead_letter" });
    const queued = createNotificationEvent({ status: "queued" });
    const delivered = createNotificationEvent({ status: "delivered" });

    expect(compareAdminNotificationPriority(failed, queued)).toBeLessThan(0);
    expect(compareAdminNotificationPriority(queued, delivered)).toBeLessThan(0);
  });

  it("classifies terminal delivery problems for admin attention", () => {
    expect(isNotificationFailureStatus("bounced")).toBe(true);
    expect(isNotificationFailureStatus("complained")).toBe(true);
    expect(isNotificationFailureStatus("dead_letter")).toBe(true);
    expect(isNotificationFailureStatus("delivered")).toBe(false);
    expect(isNotificationFailureStatus("delayed")).toBe(false);
    expect(isNotificationHistoryStatus("accepted")).toBe(true);
    expect(isNotificationHistoryStatus("delivered")).toBe(true);
    expect(isNotificationHistoryStatus("processing")).toBe(false);
    expect(isNotificationInFlightStatus("delayed")).toBe(true);
    expect(isNotificationInFlightStatus("processing")).toBe(true);
    expect(isNotificationInFlightStatus("failed")).toBe(false);
  });

  it("formats known event and aggregate labels", () => {
    expect(formatNotificationEventType("submission_reviewed")).toBe(
      "Feedback ready",
    );
    expect(formatNotificationAggregateType("entry_report")).toBe(
      "Entry report",
    );
    expect(formatNotificationEventType("profile_signup")).toBe("User signup");
    expect(formatNotificationEventType("content_release_test_sent")).toBe(
      "Release preview",
    );
    expect(formatNotificationAggregateType("profile")).toBe("Profile");
    expect(formatNotificationAggregateType("content_release")).toBe(
      "Content release",
    );
  });

  it("extracts useful context badges from payloads", () => {
    expect(getNotificationContextBadges(createNotificationEvent())).toEqual([
      "Lesson: lesson-1",
      "Exercise: grammar.exercise.lesson01.001",
      "Language: NL",
    ]);
  });

  it("handles contact notification payloads", () => {
    expect(
      getNotificationContextBadges(
        createNotificationEvent({
          aggregate_type: "contact_message",
          event_type: "contact_message_received",
          payload: {
            inquiry_type: "publication_inquiry",
            locale: "en",
            sender_email: "reader@example.com",
          },
        }),
      ),
    ).toEqual([
      "Inquiry: publication inquiry",
      "Sender: re***@example.com",
      "Locale: EN",
    ]);
  });

  it("handles profile signup notification payloads", () => {
    expect(
      getNotificationContextBadges(
        createNotificationEvent({
          aggregate_type: "profile",
          event_type: "profile_signup",
          payload: {
            profile_email: "student@example.com",
            profile_full_name: "Test Student",
          },
        }),
      ),
    ).toEqual(["Email: st***@example.com", "Name: Test Student"]);
  });

  it("handles content release preview payloads", () => {
    expect(
      getNotificationContextBadges(
        createNotificationEvent({
          aggregate_type: "content_release",
          event_type: "content_release_test_sent",
          payload: {
            audience_segment: "lessons",
            item_count: 2,
            locale: "nl",
            preview: "true",
            release_type: "lesson",
          },
        }),
      ),
    ).toEqual([
      "Audience: lessons",
      "Type: lesson",
      "Items: 2",
      "Locale: NL",
      "Preview",
    ]);
  });
});
