/** Normaliza para búsqueda: minúsculas y sin acentos ("música" ≈ "musica"). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
