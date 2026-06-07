"use client";

import {
  Check,
  ChevronDown,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetCloseButton,
  BottomSheetTrigger,
} from "@/components/BottomSheet";
import { buttonClassName } from "@/components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";
import { useMediaQuery } from "@/lib/useMediaQuery";

export type FilterMenuOption = {
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  shortLabel?: ReactNode;
  value: string;
};

type FilterBarProps = {
  activeCount?: number;
  children: ReactNode;
  className?: string;
  clearLabel?: ReactNode;
  defaultOpen?: boolean | "desktop";
  icon?: LucideIcon;
  label: ReactNode;
  onClear?: () => void;
};

type FilterMenuProps = {
  active?: boolean;
  className?: string;
  closeLabel?: string;
  icon?: LucideIcon;
  label: ReactNode;
  menuLabel?: ReactNode;
  onChange: (value: string) => void;
  options: readonly FilterMenuOption[];
  triggerClassName?: string;
  value: string;
  valueLabel: ReactNode;
};

type FilterToggleProps = {
  active?: boolean;
  className?: string;
  label: ReactNode;
  onChange: (value: boolean) => void;
  value: boolean;
  valueLabel: ReactNode;
};

export function FilterBar({
  activeCount = 0,
  children,
  className,
  clearLabel,
  defaultOpen = false,
  icon: Icon = SlidersHorizontal,
  label,
  onClear,
}: FilterBarProps) {
  const contentId = useId();
  const hasUserToggledRef = useRef(false);
  const isDesktopViewport = useMediaQuery("(min-width: 640px)");
  const [isExpanded, setIsExpanded] = useState(defaultOpen === true);

  useEffect(() => {
    if (defaultOpen === "desktop" && !hasUserToggledRef.current) {
      setIsExpanded(isDesktopViewport);
    }
  }, [defaultOpen, isDesktopViewport]);

  function toggleExpanded() {
    hasUserToggledRef.current = true;
    setIsExpanded((current) => !current);
  }

  return (
    <div
      className={cx(
        surfacePanelClassName({
          className: "relative p-3 sm:p-4",
          shadow: "soft",
        }),
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={isExpanded}
          onClick={toggleExpanded}
          className="flex min-w-0 flex-1 cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-2 py-1 text-left text-muted transition-colors hover:bg-elevated/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate text-xs font-semibold uppercase tracking-widest">
              {label}
            </span>
            {activeCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-xs font-semibold text-paper dark:bg-elevated dark:text-ink dark:ring-1 dark:ring-line">
                {activeCount}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cx(
              "h-4 w-4 shrink-0 transition-transform",
              isExpanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {activeCount > 0 && onClear && clearLabel ? (
          <button
            type="button"
            onClick={onClear}
            className={buttonClassName({
              className: "h-9 px-3 text-xs uppercase tracking-widest",
              size: "sm",
              variant: "ghost",
            })}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {clearLabel}
          </button>
        ) : null}
      </div>

      {isExpanded ? (
        <div
          id={contentId}
          className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function FilterMenu({
  active = false,
  className,
  icon: Icon,
  label,
  menuLabel,
  onChange,
  options,
  triggerClassName,
  value,
  valueLabel,
}: FilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const usesMobileSheet = useMediaQuery("(max-width: 639px)");
  let resolvedMenuLabel: string | undefined;

  if (typeof menuLabel === "string") {
    resolvedMenuLabel = menuLabel;
  } else if (typeof label === "string") {
    resolvedMenuLabel = label;
  }

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  const trigger = (
    <button
      type="button"
      className={cx(
        "inline-flex h-11 min-w-40 cursor-pointer select-none items-center justify-between gap-3 rounded-lg border px-3 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
        active
          ? "border-accent/35 bg-accent-soft/75 text-ink hover:bg-accent-soft dark:bg-accent-soft/25"
          : "border-line bg-surface/88 text-ink hover:border-accent/40 hover:bg-surface",
        triggerClassName,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        ) : null}
        <span className="min-w-0">
          <span className="block truncate text-[0.66rem] font-semibold uppercase tracking-widest text-muted">
            {label}
          </span>
          <span className="block truncate text-sm font-semibold">
            {valueLabel}
          </span>
        </span>
      </span>
      <ChevronDown
        className={cx(
          "h-4 w-4 shrink-0 text-muted transition-transform",
          isOpen && "rotate-180",
        )}
        aria-hidden="true"
      />
    </button>
  );

  const optionsList = (
    <div className="space-y-1">
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={option.disabled}
            onClick={() => handleSelect(option.value)}
            className={cx(
              "flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-45",
              isSelected
                ? "bg-accent-soft/75 text-ink dark:bg-accent-soft/25"
                : "text-muted hover:bg-elevated hover:text-ink",
            )}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
              {isSelected ? (
                <Check className="h-4 w-4 text-accent-strong dark:text-accent" />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">
                {option.shortLabel ?? option.label}
              </span>
              {option.description ? (
                <span className="mt-0.5 block text-xs leading-5 text-muted">
                  {option.description}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (usesMobileSheet) {
    return (
      <div className={cx("relative shrink-0", className)}>
        <BottomSheet open={isOpen} onOpenChange={setIsOpen}>
          <BottomSheetTrigger asChild>{trigger}</BottomSheetTrigger>
          <BottomSheetContent>
            <BottomSheetHeader>
              <BottomSheetTitle>{resolvedMenuLabel}</BottomSheetTitle>
              <BottomSheetCloseButton />
            </BottomSheetHeader>
            {optionsList}
          </BottomSheetContent>
        </BottomSheet>
      </div>
    );
  }

  return (
    <div className={cx("relative shrink-0", className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-72 max-h-80 overflow-y-auto p-2"
          align="start"
        >
          {optionsList}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FilterToggle({
  active = false,
  className,
  label,
  onChange,
  value,
  valueLabel,
}: FilterToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={cx(
        "inline-flex h-11 min-w-36 shrink-0 cursor-pointer select-none items-center justify-between gap-3 rounded-lg border px-3 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
        active
          ? "border-accent/35 bg-accent-soft/75 text-ink hover:bg-accent-soft dark:bg-accent-soft/25"
          : "border-line bg-surface/88 text-ink hover:border-accent/40 hover:bg-surface",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-[0.66rem] font-semibold uppercase tracking-widest text-muted">
          {label}
        </span>
        <span className="block truncate text-sm font-semibold">
          {valueLabel}
        </span>
      </span>
      <span
        className={cx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          value
            ? "border-accent/40 bg-accent text-paper"
            : "border-line bg-elevated",
        )}
        aria-hidden="true"
      >
        {value ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}
