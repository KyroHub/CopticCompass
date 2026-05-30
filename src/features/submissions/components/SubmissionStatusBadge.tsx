import { cx } from "@/lib/classes";

type SubmissionStatusBadgeProps = {
  label: string;
  tone: "pending" | "reviewed";
  className?: string;
};

const TONE_CLASSES: Record<SubmissionStatusBadgeProps["tone"], string> = {
  pending: "bg-accent-soft text-accent-strong dark:text-accent",
  reviewed: "bg-success/10 text-success",
};

export function SubmissionStatusBadge({
  label,
  tone,
  className,
}: SubmissionStatusBadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
