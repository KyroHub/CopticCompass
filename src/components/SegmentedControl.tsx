import {
  useId,
  useRef,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { FormLabel } from "@/components/FormField";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";

type SegmentedControlTone = "brand" | "language" | "neutral";
type SegmentedControlLayout = "scroll" | "wrap";
type SegmentedControlVariant = "default" | "flush";
type SegmentedControlBadgeTone =
  | "brand"
  | "danger"
  | "info"
  | "language"
  | "neutral"
  | "success"
  | "warning";

type SegmentedControlOption = {
  ariaLabel?: string;
  badge?: {
    text: ReactNode;
    tone?: SegmentedControlBadgeTone;
  };
  count?: number;
  disabled?: boolean;
  icon?: ComponentType<{ className?: string }>;
  label: ReactNode;
  shortLabel?: ReactNode;
  value: string;
};

type SegmentedControlProps = {
  className?: string;
  controlClassName?: string;
  label: ReactNode;
  labelClassName?: string;
  layout?: SegmentedControlLayout;
  onChange: (value: string) => void;
  options: readonly SegmentedControlOption[];
  tone?: SegmentedControlTone;
  value: string;
  variant?: SegmentedControlVariant;
};

const ACTIVE_TONE_CLASSES: Record<SegmentedControlTone, string> = {
  brand: "bg-surface text-accent-strong shadow-sm ring-1 ring-accent/20",
  language: "bg-surface text-coptic shadow-sm ring-1 ring-coptic/20",
  neutral: "bg-surface text-ink shadow-sm ring-1 ring-line",
};

const FLUSH_ACTIVE_TONE_CLASSES: Record<SegmentedControlTone, string> = {
  brand: "bg-accent-soft/75 text-ink dark:bg-accent-soft/25",
  language: "bg-coptic-soft text-coptic",
  neutral: "bg-accent-soft/75 text-ink dark:bg-accent-soft/25",
};

const COUNT_TONE_CLASSES: Record<SegmentedControlTone, string> = {
  brand: "bg-accent-soft text-accent-strong dark:text-accent",
  language: "bg-coptic/10 text-coptic",
  neutral: "bg-elevated text-muted",
};

const BADGE_TONE_CLASSES: Record<SegmentedControlBadgeTone, string> = {
  brand: "bg-accent-soft text-accent-strong dark:text-accent",
  danger: "bg-danger/10 text-danger",
  info: "bg-accent-soft text-accent-strong dark:text-accent",
  language: "bg-coptic-soft text-coptic",
  neutral: "bg-line text-muted",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

const CONTROL_LAYOUT_CLASSES: Record<SegmentedControlLayout, string> = {
  scroll: "overflow-x-auto",
  wrap: "flex-wrap overflow-visible",
};

const FLUSH_CONTROL_LAYOUT_CLASSES: Record<SegmentedControlLayout, string> = {
  scroll: "overflow-x-auto",
  wrap: "flex-wrap overflow-hidden",
};

const OPTION_LAYOUT_CLASSES: Record<SegmentedControlLayout, string> = {
  scroll: "shrink-0",
  wrap: "min-w-[7rem] flex-1 basis-[11rem]",
};

const FLUSH_OPTION_LAYOUT_CLASSES: Record<SegmentedControlLayout, string> = {
  scroll: "shrink-0",
  wrap: "min-w-0 flex-1 basis-0",
};

function getControlChromeClassName(variant: SegmentedControlVariant) {
  if (variant === "flush") {
    return surfacePanelClassName({
      className: "mt-1 flex h-11 gap-0 overflow-hidden p-0",
      shadow: "soft",
      variant: "default",
    });
  }

  return surfacePanelClassName({
    className: "mt-1 flex gap-1 p-1",
    shadow: "soft",
    variant: "subtle",
  });
}

function getOptionChromeClassName(variant: SegmentedControlVariant) {
  if (variant === "flush") {
    return "rounded-none focus-visible:ring-inset";
  }

  return "rounded-md";
}

function getOptionSizeClassName(variant: SegmentedControlVariant) {
  if (variant === "flush") {
    return "h-full min-h-0";
  }

  return "min-h-10";
}

function getControlLayoutClassName(
  variant: SegmentedControlVariant,
  layout: SegmentedControlLayout,
) {
  if (variant === "flush") {
    return FLUSH_CONTROL_LAYOUT_CLASSES[layout];
  }

  return CONTROL_LAYOUT_CLASSES[layout];
}

function getOptionLayoutClassName(
  variant: SegmentedControlVariant,
  layout: SegmentedControlLayout,
) {
  if (variant === "flush") {
    return FLUSH_OPTION_LAYOUT_CLASSES[layout];
  }

  return OPTION_LAYOUT_CLASSES[layout];
}

function getOptionStateClassName(
  variant: SegmentedControlVariant,
  isActive: boolean,
  tone: SegmentedControlTone,
) {
  if (isActive) {
    return variant === "flush"
      ? FLUSH_ACTIVE_TONE_CLASSES[tone]
      : ACTIVE_TONE_CLASSES[tone];
  }

  if (variant === "flush") {
    return "text-ink hover:bg-surface";
  }

  return "text-muted hover:bg-surface/70 hover:text-ink";
}

function getNextEnabledOptionIndex(
  options: readonly SegmentedControlOption[],
  currentIndex: number,
  direction: 1 | -1,
) {
  if (!options.length) {
    return -1;
  }

  for (let offset = 1; offset <= options.length; offset += 1) {
    const nextIndex =
      (currentIndex + offset * direction + options.length) % options.length;

    if (!options[nextIndex]?.disabled) {
      return nextIndex;
    }
  }

  return -1;
}

export function SegmentedControl({
  className,
  controlClassName,
  label,
  labelClassName,
  layout = "scroll",
  onChange,
  options,
  tone = "language",
  value,
  variant = "default",
}: SegmentedControlProps) {
  const labelId = useId();
  const groupRef = useRef<HTMLDivElement | null>(null);

  function focusOption(index: number) {
    window.requestAnimationFrame(() => {
      groupRef.current
        ?.querySelector<HTMLButtonElement>(
          `button[data-segmented-index="${index}"]`,
        )
        ?.focus();
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keyDirections: Record<string, 1 | -1 | undefined> = {
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -1,
    };
    const direction = keyDirections[event.key];
    const target = event.target as HTMLElement | null;
    const activeIndex = options.findIndex((option) => option.value === value);
    const targetIndex = Number(target?.dataset.segmentedIndex);
    const currentIndex = Number.isNaN(targetIndex) ? activeIndex : targetIndex;
    let nextIndex = -1;

    if (direction) {
      nextIndex = getNextEnabledOptionIndex(options, currentIndex, direction);
    } else if (event.key === "Home") {
      nextIndex = options.findIndex((option) => !option.disabled);
    } else if (event.key === "End") {
      nextIndex = options.findLastIndex((option) => !option.disabled);
    } else {
      return;
    }

    if (nextIndex < 0) {
      return;
    }

    event.preventDefault();
    onChange(options[nextIndex].value);
    focusOption(nextIndex);
  }

  return (
    <div className={cx("min-w-0", className)}>
      <FormLabel tone="muted" className={labelClassName}>
        <span id={labelId}>{label}</span>
      </FormLabel>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={handleKeyDown}
        className={cx(
          getControlChromeClassName(variant),
          getControlLayoutClassName(variant, layout),
          controlClassName,
        )}
      >
        {options.map((option, index) => {
          const Icon = option.icon;
          const isActive = option.value === value;
          const badgeTone = option.badge?.tone ?? "neutral";

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={option.ariaLabel}
              data-segmented-index={index}
              disabled={option.disabled}
              onClick={() => onChange(option.value)}
              className={cx(
                "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-center text-sm font-semibold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:pointer-events-none disabled:opacity-45",
                getOptionChromeClassName(variant),
                getOptionSizeClassName(variant),
                getOptionLayoutClassName(variant, layout),
                getOptionStateClassName(variant, isActive, tone),
              )}
            >
              {Icon ? (
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : null}
              <span className={option.shortLabel ? "hidden md:inline" : ""}>
                {option.label}
              </span>
              {option.shortLabel ? (
                <span className="md:hidden">{option.shortLabel}</span>
              ) : null}
              {option.badge ? (
                <span
                  className={cx(
                    "rounded px-1 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider",
                    BADGE_TONE_CLASSES[badgeTone],
                  )}
                >
                  {option.badge.text}
                </span>
              ) : null}
              {typeof option.count === "number" ? (
                <span
                  className={cx(
                    "rounded-md px-1.5 py-0.5 text-[0.68rem] font-semibold leading-none",
                    isActive ? COUNT_TONE_CLASSES[tone] : "bg-line text-muted",
                  )}
                >
                  {option.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
