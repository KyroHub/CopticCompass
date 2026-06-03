import { useMemo, useState } from "react";

import type { ShenuteProvider } from "@/features/shenute/shared";

import {
  getShenuteProviderOptions,
  type ShenuteProviderOptionsCopy,
} from "./shenuteOptions";

export function useShenuteProviderSelection(copy: ShenuteProviderOptionsCopy) {
  const [inferenceProvider, setInferenceProvider] =
    useState<ShenuteProvider>("thoth");
  const providerOptions = useMemo(
    () => getShenuteProviderOptions(copy),
    [copy],
  );
  const selectedProviderOption =
    providerOptions.find((option) => option.value === inferenceProvider) ??
    providerOptions[0]!;

  return {
    inferenceProvider,
    providerOptions,
    selectedProviderOption,
    setInferenceProvider,
  };
}
