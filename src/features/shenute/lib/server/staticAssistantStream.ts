import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export function createStaticAssistantStream(responseText: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textPartId = crypto.randomUUID();

      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textPartId });
      writer.write({ type: "text-delta", id: textPartId, delta: responseText });
      writer.write({ type: "text-end", id: textPartId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
