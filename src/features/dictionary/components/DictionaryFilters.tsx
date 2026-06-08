"use client";

import {
  FilterMenu,
  FilterToggle,
  type FilterMenuOption,
} from "@/components/FilterMenu";
import { useLanguage } from "@/components/LanguageProvider";
import {
  dialectFilterOptions,
  dictionaryEtymologyFilterOptions,
  dictionaryPartOfSpeechFilterOptions,
  getDialectFilterOptionLabel,
  type DialectFilter,
  type DictionaryEtymologyFilter,
  type DictionaryPartOfSpeechFilter,
} from "@/features/dictionary/config";
import {
  type TtsMode,
  useTtsSettings,
} from "@/features/dictionary/hooks/useTtsSettings";
import { type VoiceKey, VOICES } from "@/features/dictionary/lib/copticTts";

type DictionaryFilterControlsProps = {
  selectedDialect: DialectFilter;
  selectedEtymology: DictionaryEtymologyFilter;
  selectedPartOfSpeech: DictionaryPartOfSpeechFilter;
  setSelectedDialect: (value: DialectFilter) => void;
  setSelectedEtymology: (value: DictionaryEtymologyFilter) => void;
  setSelectedPartOfSpeech: (value: DictionaryPartOfSpeechFilter) => void;
};

type DictionaryPronunciationControlsProps = {
  selectedDialect: DialectFilter;
};

type DictionaryAdvancedFiltersProps = {
  exactMatch: boolean;
  hasGreek: boolean;
  hasInflections: boolean;
  hasRelatedEntries: boolean;
  setExactMatch: (value: boolean) => void;
  setHasGreek: (value: boolean) => void;
  setHasInflections: (value: boolean) => void;
  setHasRelatedEntries: (value: boolean) => void;
};

type DictionaryControlLayoutProps = {
  controlClassName?: string;
  triggerClassName?: string;
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

export function DictionaryFilterControls({
  controlClassName,
  selectedDialect,
  selectedEtymology,
  selectedPartOfSpeech,
  setSelectedDialect,
  setSelectedEtymology,
  setSelectedPartOfSpeech,
  triggerClassName,
}: DictionaryFilterControlsProps & DictionaryControlLayoutProps) {
  const { t } = useLanguage();
  const partOfSpeechOptions: FilterMenuOption[] =
    dictionaryPartOfSpeechFilterOptions.map((option) => ({
      label: t(option.labelKey),
      value: option.value,
    }));
  const etymologyOptions: FilterMenuOption[] =
    dictionaryEtymologyFilterOptions.map((option) => ({
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

  return (
    <>
      <FilterMenu
        active={selectedPartOfSpeech !== "ALL"}
        className={controlClassName}
        closeLabel={t("dict.hideFilters")}
        label={cleanFilterLabel(t("dict.pos"))}
        menuLabel={cleanFilterLabel(t("dict.pos"))}
        value={selectedPartOfSpeech}
        valueLabel={getSelectedOptionLabel(
          partOfSpeechOptions,
          selectedPartOfSpeech,
        )}
        options={partOfSpeechOptions}
        triggerClassName={triggerClassName}
        onChange={(value) =>
          setSelectedPartOfSpeech(value as DictionaryPartOfSpeechFilter)
        }
      />

      <FilterMenu
        active={selectedDialect !== "ALL"}
        className={controlClassName}
        closeLabel={t("dict.hideFilters")}
        label={cleanFilterLabel(t("dict.dialect"))}
        menuLabel={cleanFilterLabel(t("dict.dialect"))}
        value={selectedDialect}
        valueLabel={getSelectedOptionLabel(dialectOptions, selectedDialect)}
        options={dialectOptions}
        triggerClassName={triggerClassName}
        onChange={(value) => setSelectedDialect(value as DialectFilter)}
      />

      <FilterMenu
        active={selectedEtymology !== "ALL"}
        className={controlClassName}
        closeLabel={t("dict.hideFilters")}
        label={cleanFilterLabel(t("dict.etymology"))}
        menuLabel={cleanFilterLabel(t("dict.etymology"))}
        value={selectedEtymology}
        valueLabel={getSelectedOptionLabel(etymologyOptions, selectedEtymology)}
        options={etymologyOptions}
        triggerClassName={triggerClassName}
        onChange={(value) =>
          setSelectedEtymology(value as DictionaryEtymologyFilter)
        }
      />
    </>
  );
}

export function DictionaryAdvancedFilterControls({
  controlClassName,
  exactMatch,
  hasGreek,
  hasInflections,
  hasRelatedEntries,
  setExactMatch,
  setHasGreek,
  setHasInflections,
  setHasRelatedEntries,
}: DictionaryAdvancedFiltersProps & DictionaryControlLayoutProps) {
  const { t } = useLanguage();

  return (
    <>
      <FilterToggle
        active={exactMatch}
        className={controlClassName}
        label={t("dict.exactMatch")}
        value={exactMatch}
        valueLabel={exactMatch ? t("dict.exactMatch") : t("dict.any")}
        onChange={setExactMatch}
      />

      <FilterToggle
        active={hasGreek}
        className={controlClassName}
        label={t("dict.hasGreek")}
        value={hasGreek}
        valueLabel={hasGreek ? t("dict.required") : t("dict.any")}
        onChange={setHasGreek}
      />

      <FilterToggle
        active={hasInflections}
        className={controlClassName}
        label={t("dict.hasInflections")}
        value={hasInflections}
        valueLabel={hasInflections ? t("dict.required") : t("dict.any")}
        onChange={setHasInflections}
      />

      <FilterToggle
        active={hasRelatedEntries}
        className={controlClassName}
        label={t("dict.hasRelatedEntries")}
        value={hasRelatedEntries}
        valueLabel={hasRelatedEntries ? t("dict.required") : t("dict.any")}
        onChange={setHasRelatedEntries}
      />
    </>
  );
}

export function DictionaryPronunciationControls({
  controlClassName,
  selectedDialect,
  triggerClassName,
}: DictionaryPronunciationControlsProps & DictionaryControlLayoutProps) {
  const { t } = useLanguage();
  const { settings, updateSettings, isLoaded } = useTtsSettings();
  const showPronunciationSettings =
    isLoaded && (selectedDialect === "ALL" || selectedDialect === "B");

  if (!showPronunciationSettings) {
    return null;
  }

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

  return (
    <>
      <FilterMenu
        active={settings.mode === "premium"}
        className={controlClassName}
        closeLabel={t("dict.hideFilters")}
        label={cleanFilterLabel(t("dict.ttsMode"))}
        menuLabel={cleanFilterLabel(t("dict.ttsMode"))}
        value={settings.mode}
        valueLabel={getSelectedOptionLabel(ttsModeOptions, settings.mode)}
        options={ttsModeOptions}
        triggerClassName={triggerClassName}
        onChange={(value) => updateSettings({ mode: value as TtsMode })}
      />

      {settings.mode === "premium" ? (
        <FilterMenu
          active
          className={controlClassName}
          closeLabel={t("dict.hideFilters")}
          label={cleanFilterLabel(t("dict.ttsVoice"))}
          menuLabel={cleanFilterLabel(t("dict.ttsVoice"))}
          value={settings.voice}
          valueLabel={getSelectedOptionLabel(voiceOptions, settings.voice)}
          options={voiceOptions}
          triggerClassName={triggerClassName}
          onChange={(value) =>
            updateSettings({
              voice: value as VoiceKey,
            })
          }
        />
      ) : null}
    </>
  );
}
