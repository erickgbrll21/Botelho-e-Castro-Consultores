import clsx from "clsx";

export function Pill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "critical";
}) {
  const toneClasses = {
    neutral: "bg-neutral-900 border-neutral-800 text-neutral-200",
    success: "bg-emerald-500/15 border-emerald-500/30 text-emerald-100",
    warning: "bg-amber-500/15 border-amber-500/30 text-amber-100",
    critical: "bg-red-500/15 border-red-500/30 text-red-100",
  }[tone];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium",
        toneClasses
      )}
    >
      {label}
    </span>
  );
}
