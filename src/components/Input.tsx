import {
  forwardRef,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cx } from "@/lib/classes";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cx(
          "textarea-base",
          error &&
            "border-danger/60 focus:border-danger/80 focus:ring-danger/25",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  compact?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, compact, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cx(
          compact ? "compact-select-base" : "select-base",
          error &&
            "border-danger/60 focus:border-danger/80 focus:ring-danger/25",
          className,
        )}
        {...props}
      />
    );
  },
);
Select.displayName = "Select";
