import { getPublicOcrErrorMessage } from "@/lib/ocrErrors";
import type { Language } from "@/types/i18n";

export type ProcessShenuteOcrImage = (formData: FormData) => Promise<string>;

export type ComposeShenuteOcrPromptOptions = {
  basePrompt: string;
  image: File;
  imageContextLabel: string;
  language: Language;
  maxOcrCharacters: number;
  processImage: ProcessShenuteOcrImage;
};

type ComposeShenuteOcrPromptResult =
  | {
      prompt: string;
      success: true;
    }
  | {
      error: string;
      success: false;
    };

export function normalizeShenuteOcrText(text: string, maxCharacters: number) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxCharacters);
}

export function buildShenuteImagePrompt({
  basePrompt,
  imageContextLabel,
  imageName,
  ocrText,
}: {
  basePrompt: string;
  imageContextLabel: string;
  imageName: string;
  ocrText: string;
}) {
  return [basePrompt, imageContextLabel, `Image: ${imageName}`, ocrText]
    .filter((part) => part.length > 0)
    .join("\n\n");
}

export async function composeShenuteOcrPrompt({
  basePrompt,
  image,
  imageContextLabel,
  language,
  maxOcrCharacters,
  processImage,
}: ComposeShenuteOcrPromptOptions): Promise<ComposeShenuteOcrPromptResult> {
  try {
    const ocrFormData = new FormData();
    ocrFormData.append("file", image);
    const ocrText = await processImage(ocrFormData);

    return {
      prompt: buildShenuteImagePrompt({
        basePrompt,
        imageContextLabel,
        imageName: image.name,
        ocrText: normalizeShenuteOcrText(ocrText, maxOcrCharacters),
      }),
      success: true,
    };
  } catch (error) {
    return {
      error: getPublicOcrErrorMessage(error, language),
      success: false,
    };
  }
}
