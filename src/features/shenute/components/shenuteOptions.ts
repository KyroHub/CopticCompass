import {
  BookOpenCheck,
  Brain,
  FlaskConical,
  ImagePlus,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { ShenuteProvider } from "@/features/shenute/shared";

import type { ShenuteCopy } from "./shenuteCopy";

export type ShenuteProviderOption = {
  description: string;
  icon: LucideIcon;
  label: string;
  value: ShenuteProvider;
};

export type ShenuteStarterPrompt = {
  icon: LucideIcon;
  prompt: string;
};

export function getShenuteStarterPrompts(
  copy: ShenuteCopy,
): ShenuteStarterPrompt[] {
  return [
    {
      icon: Sparkles,
      prompt: copy.starterPromptTranslate,
    },
    {
      icon: BookOpenCheck,
      prompt: copy.starterPromptGrammar,
    },
    {
      icon: ImagePlus,
      prompt: copy.starterPromptImage,
    },
  ];
}

export function getShenuteProviderOptions(
  copy: ShenuteCopy,
): ShenuteProviderOption[] {
  return [
    {
      description: copy.providerThothDescription,
      icon: Sparkles,
      label: copy.providerThoth,
      value: "thoth",
    },
    {
      description: copy.providerGeminiDescription,
      icon: Zap,
      label: copy.providerGemini,
      value: "gemini",
    },
    {
      description: copy.providerGeminiNmtDescription,
      icon: Zap,
      label: copy.providerGeminiNmt,
      value: "gemini_nmt",
    },
    {
      description: copy.providerOpenRouterDescription,
      icon: Brain,
      label: copy.providerOpenRouter,
      value: "openrouter",
    },
    {
      description: copy.providerHfDescription,
      icon: FlaskConical,
      label: copy.providerHf,
      value: "hf",
    },
  ];
}
