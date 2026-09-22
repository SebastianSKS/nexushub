import clsx from "clsx";

interface ProgressBarProps {
  /** 0-100. Siempre determinado: nunca se muestra una barra sin valor. */
  value: number;
  label: string;
  className?: string;
}

/** ProgressBar determinada de Fluent: pista de 4px y relleno en color de acento. */
export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={clsx("h-1 w-full overflow-hidden rounded-full bg-layer-alt", className)}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-enter ease-fluent"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
