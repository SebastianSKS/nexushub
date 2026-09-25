/** Normaliza para búsqueda: minúsculas y sin acentos ("música" ≈ "musica"). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const SIN_ACENTO = new Map<string, string>();

/**
 * Como `normalize` (minúsculas y sin acentos), pero conservando el largo EXACTO: cada letra da una sola letra.
 * Así una posición encontrada en el texto plegado es la misma posición en el original (para mostrar el fragmento).
 */
export function plegar(texto: string): string {
  const minus = texto.toLowerCase();
  const base = minus.length === texto.length ? minus : texto;
  return base.replace(/[^\x00-\x7f]/g, (c) => {
    let r = SIN_ACENTO.get(c);
    if (r === undefined) {
      r = c.normalize("NFD").charAt(0) || c;
      SIN_ACENTO.set(c, r);
    }
    return r;
  });
}
