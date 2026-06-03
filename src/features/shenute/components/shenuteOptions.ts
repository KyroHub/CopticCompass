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

export type ShenuteProviderOption = {
  description: string;
  icon: LucideIcon;
  label: string;
  value: ShenuteProvider;
};

export type ShenuteProviderOptionsCopy = {
  providerGemini: string;
  providerGeminiDescription: string;
  providerGeminiNmt: string;
  providerGeminiNmtDescription: string;
  providerHf: string;
  providerHfDescription: string;
  providerOpenRouter: string;
  providerOpenRouterDescription: string;
  providerThoth: string;
  providerThothDescription: string;
};

export type ShenuteStarterPrompt = {
  icon: LucideIcon;
  prompt: string;
};

type ShenuteStarterPromptsCopy = {
  starterPromptGrammar: string;
  starterPromptImage: string;
  starterPromptTranslate: string;
};

export function getShenuteStarterPrompts(
  copy: ShenuteStarterPromptsCopy,
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
  copy: ShenuteProviderOptionsCopy,
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
