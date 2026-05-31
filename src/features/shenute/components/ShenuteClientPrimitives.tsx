import { XCircle } from "lucide-react";

import { buttonClassName } from "@/components/Button";
import { cx } from "@/lib/classes";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";

export const SHENUTE_INLINE_ACTION_BUTTON_CLASS =
  "h-8 shrink-0 gap-1.5 px-2 text-xs";
export const SHENUTE_MENU_ACTION_BUTTON_CLASS =
  "h-9 justify-start gap-2 px-3 text-xs";
export const SHENUTE_SHEET_ACTION_BUTTON_CLASS =
  "h-10 justify-start gap-2 px-3 text-xs";
export const SHENUTE_ICON_CLASS = {
  action: "h-3.5 w-3.5",
  close: "h-4 w-4",
  meta: "h-3.5 w-3.5",
  panel: "h-4 w-4",
  primary: "h-5 w-5",
} as const;
export const SHENUTE_DIALOG_BACKDROP_CLASS =
  "fixed inset-0 cursor-default bg-ink/15 backdrop-blur-[1px]";
export const SHENUTE_MOBILE_SHEET_CLASS =
  "fixed inset-x-0 bottom-0 max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-t-xl border border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-panel";
export const SHENUTE_ADAPTIVE_DIALOG_CLASS = cx(
  SHENUTE_MOBILE_SHEET_CLASS,
  "sm:left-1/2 sm:right-auto sm:top-[calc(var(--app-sticky-offset)_+_0.75rem)] sm:bottom-auto sm:max-h-[calc(100dvh_-_var(--app-sticky-offset)_-_1.5rem)] sm:-translate-x-1/2 sm:rounded-lg",
);
export const SHENUTE_UTILITY_BUTTON_CLASS =
  "h-8 w-8 shrink-0 rounded-lg border-line/70 bg-surface/75 px-0 text-muted shadow-none hover:translate-y-0 hover:border-coptic/30 hover:bg-elevated hover:text-ink focus-visible:ring-coptic/25 sm:h-9 sm:w-9";
export const SHENUTE_UTILITY_SUMMARY_CLASS = cx(
  SHENUTE_UTILITY_BUTTON_CLASS,
  "cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open:border-coptic/45 group-open:bg-coptic-soft/70 group-open:text-coptic",
);
export const SHENUTE_UTILITY_BADGE_CLASS =
  "absolute right-0.5 top-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-coptic-soft px-1 text-[0.55rem] font-semibold leading-none text-coptic ring-1 ring-coptic/20";
export const SHENUTE_UTILITY_DETAILS_SELECTOR =
  "[data-shenute-utility-details]";
export const SHENUTE_RESPONSE_DETAILS_SELECTOR =
  "[data-shenute-response-actions]";

const SHENUTE_CLOSE_BUTTON_CLASS = "h-8 w-8 shrink-0 px-0";
const SHENUTE_SURFACE_HEADING_CLASS =
  "text-xs font-semibold uppercase tracking-[0.18em] text-muted";
const SHENUTE_ACTION_GROUP_LABEL_CLASS =
  "text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted";

type ShenuteActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  actionClassName?: string;
  buttonVariant?: "primary" | "secondary";
  fullWidth?: boolean;
  icon?: ReactNode;
};

export function ShenuteSurfaceHeading({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <p id={id} className={cx(SHENUTE_SURFACE_HEADING_CLASS, className)}>
      {children}
    </p>
  );
}

export function ShenuteActionGroupLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cx(SHENUTE_ACTION_GROUP_LABEL_CLASS, className)}>
      {children}
    </p>
  );
}

function ShenuteCloseButton({
  className,
  iconClassName,
  label,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> & {
  iconClassName?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={buttonClassName({
        size: "sm",
        variant: "ghost",
        className: cx(SHENUTE_CLOSE_BUTTON_CLASS, className),
      })}
      {...props}
    >
      <XCircle className={cx(SHENUTE_ICON_CLASS.close, iconClassName)} />
    </button>
  );
}

export function ShenuteSurfaceHeader({
  children,
  className,
  closeLabel,
  onClose,
  titleId,
}: {
  children: ReactNode;
  className?: string;
  closeLabel: string;
  onClose: (event: MouseEvent<HTMLButtonElement>) => void;
  titleId?: string;
}) {
  return (
    <div className={cx("flex items-center justify-between gap-3", className)}>
      <ShenuteSurfaceHeading id={titleId}>{children}</ShenuteSurfaceHeading>
      <ShenuteCloseButton label={closeLabel} onClick={onClose} />
    </div>
  );
}

export function ShenuteActionButton({
  actionClassName = SHENUTE_MENU_ACTION_BUTTON_CLASS,
  buttonVariant = "secondary",
  children,
  className,
  fullWidth = true,
  icon,
  type = "button",
  ...props
}: ShenuteActionButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({
        fullWidth,
        size: "sm",
        variant: buttonVariant,
        className: cx(actionClassName, className),
      })}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
