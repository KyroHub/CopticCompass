import { SlidersHorizontal } from "lucide-react";

import { buttonClassName } from "@/components/Button";
import { cx } from "@/lib/classes";

import {
  SHENUTE_ICON_CLASS,
  SHENUTE_UTILITY_BUTTON_CLASS,
} from "./ShenuteClientPrimitives";

type ShenuteProviderControlsProps = {
  controlsLabel: string;
  isOpen: boolean;
  onToggle: () => void;
};

export function ShenuteProviderControls({
  controlsLabel,
  isOpen,
  onToggle,
}: ShenuteProviderControlsProps) {
  return (
    <button
      type="button"
      aria-controls="shenute-answer-style-panel"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label={controlsLabel}
      title={controlsLabel}
      onClick={onToggle}
      className={buttonClassName({
        size: "sm",
        variant: "secondary",
        className: cx(
          SHENUTE_UTILITY_BUTTON_CLASS,
          isOpen && "border-coptic/45 bg-coptic-soft/70 text-coptic",
        ),
      })}
    >
      <SlidersHorizontal className={SHENUTE_ICON_CLASS.action} />
    </button>
  );
}
