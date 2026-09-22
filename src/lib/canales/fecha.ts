const dias = new Intl.RelativeTimeFormat("es", { numeric: "auto" }); // "ayer", "hace 3 días"
const resto = new Intl.RelativeTimeFormat("es", { numeric: "always" }); // "hace 1 año", "hace 2 semanas"

/**
 * Fecha relativa en español: "hace 3 días", "hace 2 semanas".
 * `ahora` es inyectable para poder probarla con fechas fijas.
 */
export function fechaRelativa(iso: string, ahora: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((ahora - t) / 1000));

  if (s < 60) return "hace un momento";
  const min = Math.floor(s / 60);
  if (min < 60) return resto.format(-min, "minute");
  const h = Math.floor(min / 60);
  if (h < 24) return resto.format(-h, "hour");
  const d = Math.floor(h / 24);
  if (d < 7) return dias.format(-d, "day");
  if (d < 30) return resto.format(-Math.floor(d / 7), "week");
  // Entre 330 y 364 días sigue siendo "hace 11 meses": nunca "hace 12 meses" antes de cumplir el año.
  if (d < 365) return resto.format(-Math.min(11, Math.floor(d / 30)), "month");
  return resto.format(-Math.floor(d / 365), "year");
}
