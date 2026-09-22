import clsx from "clsx";

/** Tecla de atajo, p. ej. <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>. */
export function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={clsx(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-[4px] border border-stroke-strong bg-layer px-1.5",
        "font-sans text-caption text-fg-secondary",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Secuencia de teclas separadas por un espacio. */
export function KbdCombo({ keys, className }: { keys: readonly string[]; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1", className)}>
      {keys.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </span>
  );
}
