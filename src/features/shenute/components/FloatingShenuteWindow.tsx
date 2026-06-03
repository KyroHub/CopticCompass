import { cx } from "@/lib/classes";

import { FLOATING_SHENUTE_PANEL_CLASS } from "./floatingShenuteClasses";

import type { ReactNode } from "react";

type FloatingShenuteWindowProps = {
  children: ReactNode;
  onClose: () => void;
};

export function FloatingShenuteWindow({
  children,
  onClose,
}: FloatingShenuteWindowProps) {
  return (
    <>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 z-0 cursor-default bg-ink/15 backdrop-blur-[1px] pointer-events-auto sm:hidden"
        onClick={onClose}
      />
      <section className={cx(FLOATING_SHENUTE_PANEL_CLASS, "relative z-10")}>
        {children}
      </section>
    </>
  );
}
