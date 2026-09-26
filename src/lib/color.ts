/** Texto blanco u oscuro según el brillo del color de fondo (#RRGGBB), para que siempre se lea encima. */
export function colorDeTexto(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? "#1b1b1b" : "#ffffff";
}
