import { useId } from "react";

import { FormLabel } from "@/components/FormField";
import { cx } from "@/lib/classes";

import type { ReactNode, SelectHTMLAttributes } from "react";

type CompactSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: ReactNode;
  labelClassName?: string;
  wrapperClassName?: string;
};

export function CompactSelect({
  children,
  className,
  id,
  label,
  labelClassName,
  name,
  wrapperClassName,
  ...props
}: CompactSelectProps) {
  const generatedId = useId();
  const resolvedId = id ?? `compact-select-${generatedId}`;
  const resolvedName = name ?? resolvedId;

  return (
    <div className={cx("flex items-center gap-2", wrapperClassName)}>
      <FormLabel htmlFor={resolvedId} tone="muted" className={labelClassName}>
        {label}
      </FormLabel>
      <select
        {...props}
        id={resolvedId}
        name={resolvedName}
        className={cx("compact-select-base", className)}
      >
        {children}
      </select>
    </div>
  );
}
