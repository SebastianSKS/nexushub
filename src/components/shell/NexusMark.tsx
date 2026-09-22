/** Marca de NexusHub: un nodo central conectado a tres satélites. */
export function NexusMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      className="shrink-0"
    >
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      <g stroke="var(--on-accent)" strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
        <line x1="12" y1="12" x2="7" y2="7.5" />
        <line x1="12" y1="12" x2="17" y2="7.5" />
        <line x1="12" y1="12" x2="12" y2="18" />
      </g>
      <g fill="var(--on-accent)">
        <circle cx="12" cy="12" r="2.6" />
        <circle cx="7" cy="7.5" r="1.7" />
        <circle cx="17" cy="7.5" r="1.7" />
        <circle cx="12" cy="18" r="1.7" />
      </g>
    </svg>
  );
}
