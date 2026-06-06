import { describe, expect, it } from "vitest";

import { parseShenuteRetrievalAnalysisResponse } from "./shenute";

describe("parseShenuteRetrievalAnalysisResponse", () => {
  it("recovers fenced retrieval-analysis JSON and normalizes known fields", () => {
    const response = parseShenuteRetrievalAnalysisResponse(`\`\`\`json
{
  "germanTranslation": "Vater",
  "keywords": ["father", 12, "Vater"],
  "grammaticalConcepts": ["definite article"],
  "translationTarget": {
    "text": "father",
    "direction": "english-to-coptic",
    "dialect": "Bohairic",
    "expertTranslation": "ⲓⲱⲧ"
  }
}
\`\`\``);

    expect(response).toEqual({
      germanTranslation: "Vater",
      keywords: ["father", "Vater"],
      grammaticalConcepts: ["definite article"],
      translationTarget: {
        text: "father",
        direction: "english-to-coptic",
        dialect: "Bohairic",
        expertTranslation: "ⲓⲱⲧ",
      },
    });
  });

  it("rejects non-object model output", () => {
    expect(() =>
      parseShenuteRetrievalAnalysisResponse("I cannot do that."),
    ).toThrow("Shenute retrieval analysis did not return a JSON object.");
  });
});
