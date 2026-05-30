"use client";

import { Volume2 } from "lucide-react";

import {
  FilterBar,
  FilterMenu,
  FilterToggle,
  type FilterMenuOption,
} from "@/components/FilterMenu";
import { useLanguage } from "@/components/LanguageProvider";
import {
  dialectFilterOptions,
  dictionaryPartOfSpeechFilterOptions,
  getDialectFilterOptionLabel,
  type DialectFilter,
  type DictionaryPartOfSpeechFilter,
} from "@/features/dictionary/config";
import {
  type TtsMode,
  useTtsSettings,
} from "@/features/dictionary/hooks/useTtsSettings";
import { type VoiceKey, VOICES } from "@/features/dictionary/lib/copticTts";

type DictionaryFiltersProps = {
  exactMatch: boolean;
  onClearFilters?: () => void;
  selectedDialect: DialectFilter;
  selectedPartOfSpeech: DictionaryPartOfSpeechFilter;
  setExactMatch: (value: boolean) => void;
  setSelectedDialect: (value: DialectFilter) => void;
  setSelectedPartOfSpeech: (value: DictionaryPartOfSpeechFilter) => void;
};

const voiceEntries = Object.entries(VOICES) as [
  VoiceKey,
  (typeof VOICES)[VoiceKey],
][];

function cleanFilterLabel(label: string) {
  return label.replace(/:$/, "");
}

function getSelectedOptionLabel(
  options: readonly FilterMenuOption[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function DictionaryFilters({
  exactMatch,
  onClearFilters,
  selectedDialect,
  selectedPartOfSpeech,
  setExactMatch,
  setSelectedDialect,
  setSelectedPartOfSpeech,
}: DictionaryFiltersProps) {
  const { t } = useLanguage();
  const { settings, updateSettings, isLoaded } = useTtsSettings();

  const activeFilterCount = [
    selectedPartOfSpeech !== "ALL",
    selectedDialect !== "ALL",
    exactMatch,
  ].filter(Boolean).length;
  const partOfSpeechOptions: FilterMenuOption[] =
    dictionaryPartOfSpeechFilterOptions.map((option) => ({
      label: t(option.labelKey),
      value: option.value,
    }));
  const dialectOptions: FilterMenuOption[] = dialectFilterOptions.map(
    (option) => ({
      label: getDialectFilterOptionLabel(option.value, t),
      shortLabel: option.value === "ALL" ? undefined : option.value,
      value: option.value,
    }),
  );
  const ttsModeOptions: FilterMenuOption[] = [
    {
      label: t("dict.ttsModeStandard"),
      value: "standard",
    },
    {
      label: t("dict.ttsModePremium"),
      value: "premium",
    },
  ];
  const voiceOptions: FilterMenuOption[] = voiceEntries.map(([key, voice]) => ({
    label: voice.label,
    value: key,
  }));
  const showPronunciationFilters =
    isLoaded && (selectedDialect === "ALL" || selectedDialect === "B");

  return (
    <FilterBar
      activeCount={activeFilterCount}
      clearLabel={t("dict.clearFilters")}
      defaultOpen="desktop"
      label={t("dict.filters")}
      onClear={onClearFilters}
    >
      <FilterMenu
        active={selectedPartOfSpeech !== "ALL"}
        closeLabel={t("dict.hideFilters")}
        label={cleanFilterLabel(t("dict.pos"))}
        menuLabel={cleanFilterLabel(t("dict.pos"))}
        value={selectedPartOfSpeech}
        valueLabel={getSelectedOptionLabel(
          partOfSpeechOptions,
          selectedPartOfSpeech,
        )}
        options={partOfSpeechOptions}
        onChange={(value) =>
          setSelectedPartOfSpeech(value as DictionaryPartOfSpeechFilter)
        }
      />

      <FilterMenu
        active={selectedDialect !== "ALL"}
        closeLabel={t("dict.hideFilters")}
        label={cleanFilterLabel(t("dict.dialect"))}
        menuLabel={cleanFilterLabel(t("dict.dialect"))}
        value={selectedDialect}
        valueLabel={getSelectedOptionLabel(dialectOptions, selectedDialect)}
        options={dialectOptions}
        onChange={(value) => setSelectedDialect(value as DialectFilter)}
      />

      <FilterToggle
        active={exactMatch}
        label={t("dict.exactMatch")}
        value={exactMatch}
        valueLabel={exactMatch ? t("dict.exactMatch") : t("dict.any")}
        onChange={setExactMatch}
      />

      {showPronunciationFilters ? (
        <>
          <span
            className="hidden h-11 w-px shrink-0 bg-line sm:block"
            aria-hidden="true"
          />
          <FilterMenu
            active={settings.mode === "premium"}
            closeLabel={t("dict.hideFilters")}
            icon={Volume2}
            label={cleanFilterLabel(t("dict.ttsMode"))}
            menuLabel={cleanFilterLabel(t("dict.ttsMode"))}
            value={settings.mode}
            valueLabel={getSelectedOptionLabel(ttsModeOptions, settings.mode)}
            options={ttsModeOptions}
            onChange={(value) => updateSettings({ mode: value as TtsMode })}
          />

          {settings.mode === "premium" ? (
            <FilterMenu
              active
              closeLabel={t("dict.hideFilters")}
              label={cleanFilterLabel(t("dict.ttsVoice"))}
              menuLabel={cleanFilterLabel(t("dict.ttsVoice"))}
              value={settings.voice}
              valueLabel={getSelectedOptionLabel(voiceOptions, settings.voice)}
              options={voiceOptions}
              onChange={(value) =>
                updateSettings({
                  voice: value as VoiceKey,
                })
              }
            />
          ) : null}
        </>
      ) : null}
    </FilterBar>
  );
}
