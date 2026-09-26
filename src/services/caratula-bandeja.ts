import { getBlob } from "@/lib/red";

/** Lado (en píxeles) del icono de la carátula en el menú de la bandeja: Windows lo dibuja pequeño, así que 32 sobra hasta con pantallas nítidas. */
export const LADO_CARATULA_BANDEJA = 32;

const cache = new Map<string, number[] | null>();

/**
 * La carátula de una canción como píxeles RGBA de 32 × 32 (recortada al centro, como cuadrado), lista para mandarla a la
 * bandeja del sistema. `null` si no hay carátula o no se pudo bajar. Se recuerda la última para no repetir la descarga.
 */
export async function caratulaParaBandeja(url: string): Promise<number[] | null> {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url) ?? null;
  let px: number[] | null = null;
  try {
    const blob = await getBlob(url);
    if (blob) {
      const imagen = await createImageBitmap(blob);
      const lado = Math.min(imagen.width, imagen.height);
      const lienzo = document.createElement("canvas");
      lienzo.width = lienzo.height = LADO_CARATULA_BANDEJA;
      const ctx = lienzo.getContext("2d");
      if (ctx) {
        ctx.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO_CARATULA_BANDEJA, LADO_CARATULA_BANDEJA);
        px = Array.from(ctx.getImageData(0, 0, LADO_CARATULA_BANDEJA, LADO_CARATULA_BANDEJA).data);
      }
      imagen.close();
    }
  } catch {
    px = null;
  }
  if (cache.size > 8) cache.clear();
  cache.set(url, px);
  return px;
}
