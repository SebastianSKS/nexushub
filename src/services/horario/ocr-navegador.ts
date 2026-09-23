import type { PSM } from "tesseract.js";
import type { ImagenRgba } from "./imagen";
import type { LineaOcr, ModoOcr, PalabraOcr, Reconocedor, ResultadoOcr } from "./escaneo";

/** Lado mayor máximo con el que se trabaja: una foto de 12 megapíxeles no aporta nada y tardaría minutos. */
const LADO_MAXIMO = 3200;

/** Convierte un archivo de imagen (PNG, JPG, WebP…) en píxeles. */
export async function leerImagen(archivo: Blob): Promise<ImagenRgba> {
  const bitmap = await createImageBitmap(archivo);
  const k = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * k));
  const h = Math.max(1, Math.round(bitmap.height * k));
  const lienzo = document.createElement("canvas");
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No se pudo preparar la imagen.");
  ctx.fillStyle = "#fff"; // los PNG con transparencia se leen sobre blanco
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const { data } = ctx.getImageData(0, 0, w, h);
  return { data, width: w, height: h };
}

type Trabajador = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>;

let trabajador: Promise<Trabajador> | null = null;
let modoActual: ModoOcr | null = null;

/** El motor se crea una sola vez y se reutiliza: cargarlo (motor + idioma) es lo que más tarda. */
function obtenerTrabajador(): Promise<Trabajador> {
  if (!trabajador) {
    trabajador = import("tesseract.js")
      .then(({ createWorker }) =>
        // Todo sale de la propia aplicación (public/tesseract): no se descarga nada de internet.
        createWorker("spa", 1, { workerPath: "/tesseract/worker.min.js", corePath: "/tesseract/core", langPath: "/tesseract/lang", gzip: true }),
      )
      .catch((e) => {
        trabajador = null; // que se pueda reintentar
        throw e;
      });
  }
  return trabajador;
}

/** Libera la memoria del motor (tarda unos segundos en volver a cargarse la próxima vez). */
export async function cerrarOcr() {
  const t = trabajador;
  trabajador = null;
  modoActual = null;
  if (t) await (await t).terminate();
}

function aLienzo(img: ImagenRgba): HTMLCanvasElement {
  const lienzo = document.createElement("canvas");
  lienzo.width = img.width;
  lienzo.height = img.height;
  lienzo.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return lienzo;
}

export const reconocerEnNavegador: Reconocedor = async (img, modo) => {
  const t = await obtenerTrabajador();
  if (modo !== modoActual) {
    await t.setParameters({
      tessedit_pageseg_mode: (modo === "disperso" ? "11" : modo === "horas" ? "7" : "6") as PSM,
      // En la columna de horas solo puede haber dígitos, «:» y «-»: con eso «07:00 - 08:00» no se confunde con letras.
      tessedit_char_whitelist: modo === "horas" ? "0123456789:- " : "",
    });
    modoActual = modo;
  }
  const r = await t.recognize(aLienzo(img), {}, { blocks: true });
  const lineas: LineaOcr[] = [];
  const palabras: PalabraOcr[] = [];
  for (const b of r.data.blocks ?? []) {
    for (const p of b.paragraphs) {
      for (const l of p.lines) {
        lineas.push({ texto: l.text, x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1, confianza: l.confidence });
        for (const w of l.words) palabras.push({ texto: w.text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1, confianza: w.confidence });
      }
    }
  }
  return { texto: r.data.text, confianza: r.data.confidence, lineas, palabras } satisfies ResultadoOcr;
};
