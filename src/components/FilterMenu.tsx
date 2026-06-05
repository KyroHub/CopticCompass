"use client";

import {
  Check,
  ChevronDown,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { buttonClassName } from "@/components/Button";
import { cx } from "@/lib/classes";

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
  const [isExpanded, setIsExpanded] = useState(defaultOpen === true);

  useEffect(() => {
    if (defaultOpen !== "desktop") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 640px)");

    if (!hasUserToggledRef.current) {
      setIsExpanded(mediaQuery.matches);
    }

    function handleChange(event: MediaQueryListEvent) {
      if (!hasUserToggledRef.current) {
        setIsExpanded(event.matches);
      }
    }

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [defaultOpen]);

  function toggleExpanded() {
    hasUserToggledRef.current = true;
    setIsExpanded((current) => !current);
  }

  return (
    <div
      className={cx(
        "relative rounded-lg border border-line bg-surface/88 p-3 shadow-soft sm:p-4",
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
  closeLabel = "Close filters",
  icon: Icon,
  label,
  menuLabel,
  onChange,
  options,
  triggerClassName,
  value,
  valueLabel,
}: FilterMenuProps) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [usesMobileSheet, setUsesMobileSheet] = useState(false);
  let resolvedMenuLabel: string | undefined;

  if (typeof menuLabel === "string") {
    resolvedMenuLabel = menuLabel;
  } else if (typeof label === "string") {
    resolvedMenuLabel = label;
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");

    function updateMobileSheetState() {
      setUsesMobileSheet(mediaQuery.matches);
    }

    updateMobileSheetState();
    mediaQuery.addEventListener("change", updateMobileSheetState);

    return () => {
      mediaQuery.removeEventListener("change", updateMobileSheetState);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 639px)");

    if (!mediaQuery.matches) {
      return;
    }

    const originalDocumentOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = originalDocumentOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
      const menuRoot = menuRef.current ?? rootRef.current;

      menuRoot
        ?.querySelector<HTMLButtonElement>(
          `button[data-filter-value="${CSS.escape(value)}"]`,
        )
        ?.focus();
    });
  }, [isOpen, value]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let direction: 1 | -1 | 0 = 0;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      direction = 1;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      direction = -1;
    }

    if (!direction && event.key !== "Home" && event.key !== "End") {
      return;
    }

    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button[data-filter-value]:not(:disabled)",
      ),
    );

    if (!buttons.length) {
      return;
    }

    event.preventDefault();

    const currentIndex = buttons.findIndex(
      (button) => button === document.activeElement,
    );
    let nextIndex = 0;

    if (event.key === "End") {
      nextIndex = buttons.length - 1;
    } else if (event.key === "Home" || currentIndex < 0) {
      nextIndex = 0;
    } else {
      nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
    }

    buttons[nextIndex]?.focus();
  }

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  const menuSurface = isOpen ? (
    <>
      <button
        type="button"
        aria-label={closeLabel}
        className="fixed inset-0 z-[80] cursor-default bg-ink/15 backdrop-blur-[1px] sm:hidden"
        onClick={() => setIsOpen(false)}
      />
      <div
        ref={menuRef}
        id={menuId}
        role="listbox"
        tabIndex={-1}
        aria-label={resolvedMenuLabel}
        onKeyDown={handleMenuKeyDown}
        className="fixed inset-x-0 bottom-0 z-[90] max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-t-xl border border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-panel sm:absolute sm:bottom-auto sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-72 sm:max-h-80 sm:rounded-lg sm:p-2 sm:z-[60]"
      >
        <div className="mb-3 flex items-center justify-between gap-3 sm:hidden">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            {menuLabel ?? label}
          </p>
          <button
            type="button"
            aria-label={closeLabel}
            title={closeLabel}
            className={buttonClassName({
              className: "h-10 w-10 shrink-0 px-0",
              size: "sm",
              variant: "ghost",
            })}
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-1">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-filter-value={option.value}
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
      </div>
    </>
  ) : null;

  const renderedMenuSurface =
    menuSurface && usesMobileSheet && typeof document !== "undefined"
      ? createPortal(menuSurface, document.body)
      : menuSurface;

  return (
    <div ref={rootRef} className={cx("relative shrink-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((current) => !current)}
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

      {renderedMenuSurface}
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
