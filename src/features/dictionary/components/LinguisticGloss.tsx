import { MicroTooltip } from "@/components/MicroTooltip";
import { cx } from "@/lib/classes";

type LinguisticGlossSize = "body" | "compact" | "heading" | "inline";

type LinguisticGlossMarker = {
  code: string;
  label: string;
};

type LinguisticGlossProps = {
  className?: string;
  code: string;
  focusable?: boolean;
  label?: string;
  size?: LinguisticGlossSize;
};

type LinguisticGlossGroupProps = {
  className?: string;
  focusable?: boolean;
  markers: readonly LinguisticGlossMarker[];
  size?: LinguisticGlossSize;
};

const GLOSS_SIZE_CLASSES: Record<LinguisticGlossSize, string> = {
  body: "text-xs",
  compact: "text-sm",
  heading: "self-center text-[0.48em]",
  inline: "text-[0.86em]",
};

const LINGUISTIC_GLOSS_BASE_CLASS_NAME =
  "small-caps inline-flex items-baseline whitespace-nowrap font-sans font-semibold leading-none text-muted";
const LINGUISTIC_GLOSS_TOOLTIP_CLASS_NAME =
  "small-caps whitespace-nowrap font-sans font-semibold leading-none text-muted";

function formatLinguisticGlossCode(code: string) {
  return code.trim().toLocaleLowerCase();
}

function getLinguisticGlossClassName(
  size: LinguisticGlossSize = "body",
  className?: string,
) {
  return cx(
    LINGUISTIC_GLOSS_BASE_CLASS_NAME,
    GLOSS_SIZE_CLASSES[size],
    className,
  );
}

function getLinguisticGlossTooltipClassName(
  size: LinguisticGlossSize = "body",
  className?: string,
) {
  return cx(
    LINGUISTIC_GLOSS_TOOLTIP_CLASS_NAME,
    GLOSS_SIZE_CLASSES[size],
    className,
  );
}

export function LinguisticGloss({
  className,
  code,
  focusable = true,
  label,
  size = "body",
}: LinguisticGlossProps) {
  const displayCode = formatLinguisticGlossCode(code);

  if (!displayCode) {
    return null;
  }

  if (!label) {
    const resolvedClassName = getLinguisticGlossClassName(size, className);

    return <span className={resolvedClassName}>{displayCode}</span>;
  }

  const resolvedClassName = getLinguisticGlossTooltipClassName(size, className);

  return (
    <MicroTooltip
      label={label}
      className={resolvedClassName}
      focusable={focusable}
    >
      {displayCode}
    </MicroTooltip>
  );
}

export function LinguisticGlossGroup({
  className,
  focusable = true,
  markers,
  size = "body",
}: LinguisticGlossGroupProps) {
  if (markers.length === 0) {
    return null;
  }

  return (
    <span
      className={cx(
        "inline-flex items-baseline gap-1",
        size === "heading" && "self-center",
        className,
      )}
    >
      {markers.map((marker, index) => (
        <LinguisticGloss
          key={`${marker.code}-${index}`}
          code={marker.code}
          label={marker.label}
          size={size}
          focusable={focusable}
        />
      ))}
    </span>
  );
}
