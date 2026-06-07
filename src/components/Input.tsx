import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cx } from "@/lib/classes";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cx(
          "input-base",
          error &&
            "border-danger/60 focus:border-danger/80 focus:ring-danger/25",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
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

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
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
