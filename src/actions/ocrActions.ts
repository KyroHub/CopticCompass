"use server";

import {
  consumeOcrRateLimit,
  getOcrUploadSizeFailure,
} from "@/lib/server/ocrProtection";
import {
  buildOcrTargetUrl,
  extractTextWithOcrService,
  getOcrServiceUrlOrThrow,
  getUploadedOcrFile,
} from "@/lib/server/ocrService";

export async function processOCRImage(formData: FormData): Promise<string> {
  const file = getUploadedOcrFile(formData);
  const uploadSizeFailure = getOcrUploadSizeFailure(file.size);
  if (uploadSizeFailure) {
    throw new Error(uploadSizeFailure.message);
  }

  const rateLimitFailure = await consumeOcrRateLimit();
  if (rateLimitFailure) {
    throw new Error(rateLimitFailure.message);
  }

  return extractTextWithOcrService({
    file,
    targetUrl: buildOcrTargetUrl({
      ocrServiceUrl: getOcrServiceUrlOrThrow(),
    }),
  });
}
