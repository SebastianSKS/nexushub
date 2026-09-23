/** Imagen en bruto (RGBA, 4 bytes por píxel), igual en el navegador (canvas) que en Node (pruebas). */
export interface ImagenRgba {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export type Rgb = readonly [number, number, number];

export const luminancia = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

export const distancia = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const aHex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Color medio de un rectángulo (los bordes se recortan solos si se salen). */
export function colorMedio(img: ImagenRgba, x0: number, y0: number, x1: number, y1: number): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(img.height, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(img.width, Math.ceil(x1)); x++) {
      const i = (y * img.width + x) * 4;
      r += img.data[i]!;
      g += img.data[i + 1]!;
      b += img.data[i + 2]!;
      n++;
    }
  }
  return n === 0 ? [255, 255, 255] : [r / n, g / n, b / n];
}

export function recortar(img: ImagenRgba, x0: number, y0: number, x1: number, y1: number): ImagenRgba {
  const ax = Math.max(0, Math.floor(x0));
  const ay = Math.max(0, Math.floor(y0));
  const bx = Math.min(img.width, Math.ceil(x1));
  const by = Math.min(img.height, Math.ceil(y1));
  const w = Math.max(1, bx - ax);
  const h = Math.max(1, by - ay);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const desde = ((ay + y) * img.width + ax) * 4;
    data.set(img.data.subarray(desde, desde + w * 4), y * w * 4);
  }
  return { data, width: w, height: h };
}

/** Amplía con interpolación bilineal: el texto pequeño de una captura se lee mucho mejor a 3–4 veces su tamaño. */
export function escalar(img: ImagenRgba, k: number): ImagenRgba {
  if (k === 1) return img;
  const w = Math.round(img.width * k);
  const h = Math.round(img.height * k);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(img.height - 1, Math.max(0, (y + 0.5) / k - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(img.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.max(0, (x + 0.5) / k - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(img.width - 1, x0 + 1);
      const fx = sx - x0;
      for (let c = 0; c < 4; c++) {
        const a = img.data[(y0 * img.width + x0) * 4 + c]!;
        const b = img.data[(y0 * img.width + x1) * 4 + c]!;
        const d = img.data[(y1 * img.width + x0) * 4 + c]!;
        const e = img.data[(y1 * img.width + x1) * 4 + c]!;
        data[(y * w + x) * 4 + c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
      }
    }
  }
  return { data, width: w, height: h };
}

/** Texto negro sobre fondo blanco, con un margen blanco alrededor (así lo lee mejor el reconocedor). */
export function aBlancoYNegro(img: ImagenRgba, esTinta: (lum: number) => boolean, margen = 12): ImagenRgba {
  const w = img.width + margen * 2;
  const h = img.height + margen * 2;
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (esTinta(luminancia(img.data[i]!, img.data[i + 1]!, img.data[i + 2]!))) {
        const o = ((y + margen) * w + x + margen) * 4;
        data[o] = 0;
        data[o + 1] = 0;
        data[o + 2] = 0;
      }
    }
  }
  return { data, width: w, height: h };
}

/**
 * Prepara el recorte de un bloque de color para leerlo: el fondo pasa a blanco y las letras a negro.
 * La tinta es lo que se aleja del color del bloque, sea más oscuro (lo normal) o más claro (letras blancas).
 */
const FACTOR = 0.82; // tinta = lo más oscuro que el 82 % de la luminosidad del fondo (con letras finas de captura, un corte más bajo las rompe)
export function prepararBloque(img: ImagenRgba, fondo: Rgb): ImagenRgba {
  const lumFondo = luminancia(...fondo);
  let oscuros = 0;
  let claros = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    const l = luminancia(img.data[i]!, img.data[i + 1]!, img.data[i + 2]!);
    if (l < lumFondo * FACTOR) oscuros++;
    else if (l > lumFondo + (255 - lumFondo) * 0.6) claros++;
  }
  const claraLaTinta = claros > oscuros * 1.5 && claros > img.data.length / 4 / 200;
  return aBlancoYNegro(img, claraLaTinta ? (l) => l > lumFondo + (255 - lumFondo) * 0.6 : (l) => l < lumFondo * FACTOR);
}

export interface Tramo {
  desde: number;
  hasta: number;
  color: Rgb;
}

const DIST_MISMO_COLOR = 20;

export const esBlanco = (c: Rgb) => Math.min(c[0], c[1], c[2]) >= 236;

/**
 * Parte una columna de píxeles en tramos de color casi constante. Las líneas finas de la cuadrícula (de
 * hasta `grosorLinea` píxeles) no cortan un tramo; se quedan fuera los tramos demasiado cortos para ser una clase.
 */
export function segmentarColores(colores: readonly Rgb[], largoMinimo: number, grosorLinea = 3): Tramo[] {
  const tramos: Tramo[] = [];
  let ini = 0;
  let suma: [number, number, number] = [0, 0, 0];
  let n = 0;
  const media = (): Rgb => [suma[0] / n, suma[1] / n, suma[2] / n];
  const cerrar = (fin: number) => {
    if (n > 0) tramos.push({ desde: ini, hasta: fin, color: media() });
  };
  for (let y = 0; y < colores.length; y++) {
    const c = colores[y]!;
    if (n === 0) {
      ini = y;
      suma = [c[0], c[1], c[2]];
      n = 1;
      continue;
    }
    if (distancia(c, media()) <= DIST_MISMO_COLOR) {
      suma = [suma[0] + c[0], suma[1] + c[1], suma[2] + c[2]];
      n++;
      continue;
    }
    // ¿Una línea fina (los siguientes píxeles vuelven al mismo color) o un cambio de verdad?
    let vuelve = false;
    for (let k = 1; k <= grosorLinea && y + k < colores.length; k++) {
      if (distancia(colores[y + k]!, media()) <= DIST_MISMO_COLOR) {
        vuelve = true;
        break;
      }
    }
    if (vuelve) continue;
    cerrar(y);
    ini = y;
    suma = [c[0], c[1], c[2]];
    n = 1;
  }
  cerrar(colores.length);

  const largos = tramos.filter((t) => t.hasta - t.desde >= largoMinimo);
  // Tramos vecinos del mismo color que solo quedaron separados por una línea o una franja corta: se unen.
  const unidos: Tramo[] = [];
  for (const t of largos) {
    const previo = unidos[unidos.length - 1];
    if (previo && t.desde - previo.hasta <= grosorLinea + 1 && distancia(previo.color, t.color) <= DIST_MISMO_COLOR) previo.hasta = t.hasta;
    else unidos.push({ ...t });
  }
  return unidos;
}

const esTrazo = (img: ImagenRgba, x: number, y: number) => {
  const i = (y * img.width + x) * 4;
  return luminancia(img.data[i]!, img.data[i + 1]!, img.data[i + 2]!) < 225;
};

/** Agrupa posiciones consecutivas que pasan la prueba y devuelve el centro de cada grupo. */
function centrosDeRachas(cuantas: number, pasa: (i: number) => boolean): number[] {
  const centros: number[] = [];
  let ini = -1;
  for (let i = 0; i <= cuantas; i++) {
    const ok = i < cuantas && pasa(i);
    if (ok && ini < 0) ini = i;
    if (!ok && ini >= 0) {
      centros.push((ini + i - 1) / 2);
      ini = -1;
    }
  }
  return centros;
}

/** Posición (x) de las líneas verticales de la cuadrícula: las que cruzan casi todo el alto de la franja [yA, yB]. */
export function lineasVerticales(img: ImagenRgba, yA: number, yB: number, minFraccion = 0.8): number[] {
  const a = Math.max(0, Math.floor(yA));
  const b = Math.min(img.height, Math.ceil(yB));
  if (b - a < 3) return [];
  return centrosDeRachas(img.width, (x) => {
    let n = 0;
    for (let y = a; y < b; y++) if (esTrazo(img, x, y)) n++;
    return n / (b - a) >= minFraccion;
  });
}

/** Posición (y) de las líneas horizontales que cruzan casi todo el ancho de la franja [xA, xB]. */
export function lineasHorizontales(img: ImagenRgba, xA: number, xB: number, yA: number, yB: number, minFraccion = 0.8): number[] {
  const a = Math.max(0, Math.floor(xA));
  const b = Math.min(img.width, Math.ceil(xB));
  if (b - a < 3) return [];
  const y0 = Math.max(0, Math.floor(yA));
  const y1 = Math.min(img.height, Math.ceil(yB));
  return centrosDeRachas(y1 - y0, (k) => {
    let n = 0;
    for (let x = a; x < b; x++) if (esTrazo(img, x, y0 + k)) n++;
    return n / (b - a) >= minFraccion;
  }).map((c) => c + y0);
}

/**
 * Color «de fondo» de una fila de píxeles: se miran unos puntos junto a los dos bordes (el texto casi nunca
 * llega hasta ahí) y gana el color que más se repite; si hay empate, el más claro (el texto es más oscuro).
 */
export function colorDeFondoEnFila(img: ImagenRgba, xA: number, xB: number, y: number): Rgb {
  const ancho = xB - xA;
  const yy = Math.min(img.height - 1, Math.max(0, y));
  const muestras: Rgb[] = [0, 0.04, 0.08, 0.92, 0.96, 1].map((f) => {
    const x = Math.min(img.width - 1, Math.max(0, Math.round(xA + ancho * f)));
    const i = (yy * img.width + x) * 4;
    return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!] as const;
  });
  let mejor: Rgb[] = [];
  for (const m of muestras) {
    const grupo = muestras.filter((o) => distancia(o, m) <= 30);
    const lum = (g: Rgb[]) => g.reduce((s, c) => s + luminancia(c[0], c[1], c[2]), 0) / g.length;
    if (grupo.length > mejor.length || (grupo.length === mejor.length && lum(grupo) > lum(mejor))) mejor = grupo;
  }
  const n = mejor.length;
  return [mejor.reduce((s, c) => s + c[0], 0) / n, mejor.reduce((s, c) => s + c[1], 0) / n, mejor.reduce((s, c) => s + c[2], 0) / n];
}
