export function buildPublicOpenApiCommonSchemas() {
  return {
    ErrorResponse: {
      type: "object",
      required: ["error"],
      properties: {
        error: {
          type: "string",
        },
      },
      additionalProperties: false,
    },
  };
}
