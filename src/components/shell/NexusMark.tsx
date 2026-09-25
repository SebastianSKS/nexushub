import { useId } from "react";

/** Logo de la aplicación: una «N» blanca sobre un cuadrado azul con degradado, con su nodo amarillo (el «nexo»). Mismos colores que el icono. */
export function NexusMark({ size = 24 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" className="shrink-0">
      <defs>
        <linearGradient id={`f${id}`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#2fa4ff" />
          <stop offset="0.55" stopColor="#0f6cbd" />
          <stop offset="1" stopColor="#0a3f86" />
        </linearGradient>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dcecff" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="22.5" height="22.5" rx="5.25" fill={`url(#f${id})`} />
      <rect x="0.75" y="0.75" width="22.5" height="11" rx="5.25" fill="#fff" opacity="0.14" />
      <path fill={`url(#l${id})`} d="M6.3 17.9V6.1h3l5.4 7.2V6.1h3v11.8h-3L9.3 10.7v7.2z" />
      <circle cx="18.1" cy="5.9" r="1.9" fill="#ffd23f" />
    </svg>
  );
}
