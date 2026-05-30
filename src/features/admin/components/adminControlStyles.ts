import { surfacePanelClassName } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";

type AdminControlClassNameOptions = {
  active?: boolean;
  className?: string;
};

type AdminPanelClassNameOptions = {
  className?: string;
};

const ADMIN_INTERACTIVE_BASE_CLASS =
  "cursor-pointer select-none border transition-all duration-200 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

const ADMIN_IDLE_CONTROL_CLASS =
  "border-line bg-surface/70 text-muted hover:border-accent/40 hover:bg-elevated hover:text-ink";

const ADMIN_ACTIVE_CONTROL_CLASS =
  "border-accent/35 bg-accent-soft/75 text-ink shadow-sm dark:bg-accent-soft/25";

export function adminStickyPanelClassName({
  className,
}: AdminPanelClassNameOptions = {}) {
  return surfacePanelClassName({
    shadow: "soft",
    className: cx("app-sticky-panel p-3 dark:shadow-black/20", className),
  });
}

export function adminSummaryPanelClassName({
  className,
}: AdminPanelClassNameOptions = {}) {
  return surfacePanelClassName({
    shadow: "soft",
    className: cx("p-5 dark:shadow-black/20", className),
  });
}

export function adminFilterToggleClassName({
  active = false,
  className,
}: AdminControlClassNameOptions = {}) {
  return cx(
    ADMIN_INTERACTIVE_BASE_CLASS,
    "rounded-full px-4 py-2 text-sm font-semibold",
    active
      ? "border-accent/25 bg-accent-soft text-accent-strong shadow-sm dark:text-accent"
      : ADMIN_IDLE_CONTROL_CLASS,
    className,
  );
}

export function adminModeCardClassName({
  active = false,
  className,
}: AdminControlClassNameOptions = {}) {
  return cx(
    ADMIN_INTERACTIVE_BASE_CLASS,
    "rounded-lg px-3 py-3 text-left",
    active ? ADMIN_ACTIVE_CONTROL_CLASS : ADMIN_IDLE_CONTROL_CLASS,
    className,
  );
}

export function adminNavChipClassName({
  className,
}: Pick<AdminControlClassNameOptions, "className"> = {}) {
  return cx(
    ADMIN_INTERACTIVE_BASE_CLASS,
    ADMIN_IDLE_CONTROL_CLASS,
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold",
    className,
  );
}

export function adminQueueLinkClassName({
  className,
}: Pick<AdminControlClassNameOptions, "className"> = {}) {
  return cx(
    ADMIN_INTERACTIVE_BASE_CLASS,
    ADMIN_IDLE_CONTROL_CLASS,
    "rounded-lg p-3 hover:shadow-sm",
    className,
  );
}

export function adminReviewQueueItemClassName({
  active = false,
  className,
}: AdminControlClassNameOptions = {}) {
  return cx(
    surfacePanelClassName({
      rounded: "lg",
      variant: active ? "elevated" : "subtle",
      className: cx(
        ADMIN_INTERACTIVE_BASE_CLASS,
        "w-full p-5 text-left",
        className,
      ),
    }),
    active
      ? "border-accent/35 bg-accent-soft/75 shadow-panel dark:bg-accent-soft/25 dark:shadow-black/20"
      : "hover:border-accent/40 hover:bg-surface dark:hover:bg-elevated",
  );
}
