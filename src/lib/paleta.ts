/**
 * Los colores de una portada para pintar el fondo de Xook: hasta tres tonos distintos, lo bastante vivos para que se
 * noten y lo bastante apagados para que el texto se siga leyendo. Lógica pura (recibe los píxeles) para poder probarla.
 */

export type Rgb = [number, number, number];

/** Tono (0-360), saturación y luz (0-1). */
export function aHsl(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = [r / 255, g / 255, b / 255];
  const max = Math.max(x, y, z);
  const min = Math.min(x, y, z);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === x ? ((y - z) / d + 6) % 6 : max === y ? (z - x) / d + 2 : (x - y) / d + 4;
  return [h * 60, s, l];
}

export function aRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const p = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((p % 2) - 1));
  const [r, g, b] = p < 1 ? [c, x, 0] : p < 2 ? [x, c, 0] : p < 3 ? [0, c, x] : p < 4 ? [0, x, c] : p < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const GRUPOS = 12;

/** `pixeles` es RGBA seguido, como el de un lienzo. Siempre devuelve tres colores, o null si no hay nada que leer. */
export function paletaDe(pixeles: ArrayLike<number>): [Rgb, Rgb, Rgb] | null {
  const grupos = Array.from({ length: GRUPOS }, () => ({ peso: 0, r: 0, g: 0, b: 0 }));
  let vistos = 0;
  let conColor = 0;
  let luz = 0;
  for (let i = 0; i + 3 < pixeles.length; i += 4) {
    if (pixeles[i + 3]! < 128) continue; // transparente
    const [r, g, b] = [pixeles[i]!, pixeles[i + 1]!, pixeles[i + 2]!];
    const [h, s, l] = aHsl(r, g, b);
    vistos++;
    luz += l;
    if (s < 0.18 || l < 0.1 || l > 0.9) continue; // negros, blancos y grises no dan color
    conColor++;
    const peso = s * (1 - Math.abs(l - 0.5)) + 0.05;
    const grupo = grupos[Math.floor(h / (360 / GRUPOS)) % GRUPOS]!;
    grupo.peso += peso;
    grupo.r += r * peso;
    grupo.g += g * peso;
    grupo.b += b * peso;
  }
  if (vistos === 0) return null;

  // Portada en blanco y negro: tonos neutros, apenas fríos.
  if (conColor < vistos * 0.03) {
    const base = entre(luz / vistos, 0.3, 0.55);
    return [aRgb(220, 0.08, base), aRgb(230, 0.1, base - 0.1), aRgb(210, 0.06, base + 0.1)];
  }

  const ordenados = grupos.map((g, indice) => ({ ...g, indice })).filter((g) => g.peso > 0).sort((a, b) => b.peso - a.peso);
  const elegidos: typeof ordenados = [];
  for (const g of ordenados) {
    if (elegidos.length === 3 || g.peso < ordenados[0]!.peso * 0.1) break;
    // Que sean tonos que se distingan: al menos 60° entre ellos.
    if (elegidos.every((e) => Math.min(Math.abs(e.indice - g.indice), GRUPOS - Math.abs(e.indice - g.indice)) >= 2)) elegidos.push(g);
  }

  const tonos = elegidos.map((g) => {
    const [h, s, l] = aHsl(g.r / g.peso, g.g / g.peso, g.b / g.peso);
    return { h, s: entre(s, 0.45, 0.9), l: entre(l, 0.38, 0.58) };
  });
  // Si la portada es de un solo color, se acompaña con tonos vecinos.
  const principal = tonos[0]!;
  const vecinos = [
    { h: principal.h + 28, s: principal.s, l: entre(principal.l + 0.08, 0.38, 0.62) },
    { h: principal.h - 28, s: principal.s, l: entre(principal.l - 0.1, 0.3, 0.58) },
  ];
  while (tonos.length < 3) tonos.push(vecinos.shift()!);
  const [a, b, c] = tonos.map((t) => aRgb(t.h, t.s, t.l));
  return [a!, b!, c!];
}
