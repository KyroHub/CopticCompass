export const publicOpenApiResponses = {
  BadRequest: {
    description: "Invalid query parameter or unsupported filter value.",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse",
        },
        examples: {
          invalidStatus: {
            value: {
              error: "Invalid lesson status filter: preview",
            },
          },
          unknownLesson: {
            value: {
              error: "Unknown lesson filter: missing-lesson",
            },
          },
        },
      },
    },
  },
  NotFound: {
    description: "Requested resource was not found.",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse",
        },
        example: {
          error: "Grammar lesson not found for slug: missing-lesson",
        },
      },
    },
  },
  Unauthorized: {
    description: "Authentication is required for this endpoint.",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse",
        },
        example: {
          error: "Sign in required to use Shenute AI.",
        },
      },
    },
  },
  TooManyRequests: {
    description: "The selected provider is rate-limited.",
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse",
        },
        example: {
          error:
            "Hugging Face is currently rate-limited. Please retry in a moment or switch provider.",
        },
      },
    },
  },
  ServiceUnavailable: {
    description:
      "The backing service or required runtime configuration is unavailable.",
    content: {
      "application/json": {
        schema: {
          oneOf: [
            {
              $ref: "#/components/schemas/ErrorResponse",
            },
            {
              $ref: "#/components/schemas/OcrProxyError",
            },
          ],
        },
        examples: {
          shenuteUnavailable: {
            value: {
              error: "Shenute AI is unavailable right now.",
            },
          },
          ocrUnavailable: {
            value: {
              success: false,
              code: "external_service_unavailable",
              error:
                "OCR could not read this image right now. Please try again.",
              requestId: "ocr_00000000-0000-4000-8000-000000000000",
            },
          },
        },
      },
    },
  },
};
