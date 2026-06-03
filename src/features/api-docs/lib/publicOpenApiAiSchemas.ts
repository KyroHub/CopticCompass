export function buildPublicOpenApiAiSchemas() {
  return {
    ShenuteUiMessage: {
      type: "object",
      description:
        "AI SDK UIMessage-compatible object. Coptic Compass reads the role and text/image parts and preserves additional AI SDK fields.",
      required: ["role", "parts"],
      properties: {
        id: {
          type: "string",
        },
        role: {
          type: "string",
          enum: ["user", "assistant", "system"],
        },
        parts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
    ShenuteRequest: {
      type: "object",
      required: ["messages"],
      properties: {
        id: {
          type: "string",
          description:
            "Optional Shenute session id used for conversation history and reasoning cache continuity.",
          example: "default",
        },
        inferenceProvider: {
          type: "string",
          enum: ["thoth", "openrouter", "gemini", "hf"],
          default: "thoth",
        },
        messages: {
          type: "array",
          minItems: 1,
          items: {
            $ref: "#/components/schemas/ShenuteUiMessage",
          },
        },
        pageContext: {
          type: "object",
          description:
            "Optional current-page context used to ground the answer.",
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
    OcrUploadRequest: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description:
            "Image, PDF, or document file. The proxy forwards the first non-empty file field it receives.",
        },
        lang: {
          type: "string",
          description:
            "Optional language code. The query-string `lang` value takes precedence.",
          example: "cop",
        },
      },
      additionalProperties: true,
    },
    OcrProxyError: {
      type: "object",
      required: ["success", "code", "error"],
      properties: {
        success: {
          type: "boolean",
          enum: [false],
        },
        code: {
          type: "string",
          enum: [
            "external_service_unavailable",
            "rate_limited",
            "validation_failed",
          ],
        },
        error: {
          type: "string",
        },
        requestId: {
          type: "string",
          description:
            "Present on server-side OCR proxy failures for support correlation.",
        },
      },
      additionalProperties: false,
    },
  };
}
