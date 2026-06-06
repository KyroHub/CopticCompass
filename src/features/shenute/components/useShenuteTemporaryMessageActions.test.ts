import { describe, expect, it } from "vitest";

import {
  applyShenuteTemporaryMessageActionState,
  clearShenuteTemporaryMessageActionState,
} from "./useShenuteTemporaryMessageActions";

describe("Shenute temporary message action state helpers", () => {
  it("adds or replaces the status for a message", () => {
    expect(
      applyShenuteTemporaryMessageActionState(
        {
          "message-1": {
            message: "Copied.",
            status: "success",
          },
        },
        "message-1",
        {
          message: "Copy manually.",
          status: "pending",
        },
      ),
    ).toEqual({
      "message-1": {
        message: "Copy manually.",
        status: "pending",
      },
    });
  });

  it("clears only the matching temporary status message", () => {
    const current = {
      "message-1": {
        message: "Copy manually.",
        status: "pending" as const,
      },
      "message-2": {
        message: "Copied.",
        status: "success" as const,
      },
    };

    expect(
      clearShenuteTemporaryMessageActionState(
        current,
        "message-1",
        "Copy manually.",
      ),
    ).toEqual({
      "message-2": {
        message: "Copied.",
        status: "success",
      },
    });
  });

  it("keeps newer statuses when an older timeout resolves", () => {
    const current = {
      "message-1": {
        message: "Copied.",
        status: "success" as const,
      },
    };

    expect(
      clearShenuteTemporaryMessageActionState(
        current,
        "message-1",
        "Copy manually.",
      ),
    ).toBe(current);
  });
});
