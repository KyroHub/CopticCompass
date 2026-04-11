import { useId } from "react";

import { cx } from "@/lib/classes";

import type { InputHTMLAttributes, ReactNode } from "react";

type CheckboxFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "children" | "type"
> & {
  description?: ReactNode;
  label: ReactNode;
  labelClassName?: string;
  wrapperClassName?: string;
};

export function CheckboxField({
  checked,
  className,
  defaultChecked,
  description,
  disabled,
  id,
  label,
  labelClassName,
  name,
  onChange,
  value,
  wrapperClassName,
  ...props
}: CheckboxFieldProps) {
  const generatedId = useId();
  const resolvedId = id ?? `checkbox-${generatedId}`;
  const resolvedName = name ?? resolvedId;

  return (
    <label
      htmlFor={resolvedId}
      className={cx(
        "checkbox-row",
        disabled && "cursor-not-allowed opacity-70",
        wrapperClassName,
      )}
    >
      <input
        {...props}
        id={resolvedId}
        checked={checked}
        className={cx("checkbox-base", className)}
        defaultChecked={defaultChecked}
        disabled={disabled}
        name={resolvedName}
        onChange={onChange}
        type="checkbox"
        value={value}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cx(
            "block text-sm font-medium leading-6 text-stone-700 dark:text-stone-200",
            labelClassName,
          )}
        >
          {label}
        </span>
        {description ? (
          <span className="mt-1 block text-sm leading-6 text-stone-500 dark:text-stone-400">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
