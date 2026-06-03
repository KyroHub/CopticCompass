import { buildPublicOpenApiAiSchemas } from "./publicOpenApiAiSchemas";
import { buildPublicOpenApiCommonSchemas } from "./publicOpenApiCommonSchemas";
import { buildPublicOpenApiDictionarySchemas } from "./publicOpenApiDictionarySchemas";
import { buildPublicOpenApiGrammarSchemas } from "./publicOpenApiGrammarSchemas";
import { buildPublicOpenApiParameters } from "./publicOpenApiParameters";
import { publicOpenApiResponses } from "./publicOpenApiResponses";

import type { PublicOpenApiContext } from "./publicOpenApiShared";

/**
 * Builds the reusable OpenAPI components shared by the public API endpoints,
 * including shared parameters, error responses, and schema definitions.
 */
export function buildPublicOpenApiComponents(context: PublicOpenApiContext) {
  return {
    parameters: buildPublicOpenApiParameters(context),
    responses: publicOpenApiResponses,
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "sb-access-token",
        description:
          "Supabase-backed browser session cookie. Exact cookie names vary by deployment configuration.",
      },
    },
    schemas: {
      ...buildPublicOpenApiCommonSchemas(),
      ...buildPublicOpenApiDictionarySchemas(),
      ...buildPublicOpenApiAiSchemas(),
      ...buildPublicOpenApiGrammarSchemas(context),
    },
  };
}
