import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AdminErrorDisclosure,
  AdminTechnicalDetails,
} from "./AdminErrorDisclosure";

describe("AdminErrorDisclosure", () => {
  it("shows calm summary copy before collapsed technical details", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AdminErrorDisclosure, {
        language: "en",
        message:
          "Release drafts could not load right now. Refresh the admin workspace.",
        technicalDetails: {
          code: "42P01",
          message: 'relation "content_releases" does not exist',
        },
      }),
    );

    expect(markup).toContain("Release drafts could not load right now");
    expect(markup).toContain("Technical details");
    expect(markup).toContain("Show technical details");
    expect(markup).toContain("42P01");
    expect(markup).toContain("content_releases");
    expect(markup).toContain("<details");
    expect(markup).not.toContain("<details open");
  });

  it("omits the disclosure control when no technical detail is available", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AdminErrorDisclosure, {
        language: "en",
        message: "Could not queue this release for delivery.",
        technicalDetails: "   ",
      }),
    );

    expect(markup).toContain("Could not queue this release for delivery.");
    expect(markup).not.toContain("<details");
    expect(markup).not.toContain("Technical details");
  });

  it("localizes the disclosure labels", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AdminTechnicalDetails, {
        details: new Error("Resend API returned 503"),
        language: "nl",
      }),
    );

    expect(markup).toContain("Technische details");
    expect(markup).toContain("Technische details tonen");
    expect(markup).toContain("Technische details verbergen");
    expect(markup).toContain("Resend API returned 503");
  });
});
