import { MessageCircle } from "lucide-react";

import { FLOATING_SHENUTE_LAUNCHER_CLASS } from "./floatingShenuteClasses";

type FloatingShenuteTriggerProps = {
  label: string;
  onClick: () => void;
  onFocus?: () => void;
  onMouseEnter?: () => void;
  onPointerDown?: () => void;
};

export function FloatingShenuteTrigger({
  label,
  onClick,
  onFocus,
  onMouseEnter,
  onPointerDown,
}: FloatingShenuteTriggerProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onFocus={onFocus}
      onMouseEnter={onMouseEnter}
      onPointerDown={onPointerDown}
      className={FLOATING_SHENUTE_LAUNCHER_CLASS}
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}
