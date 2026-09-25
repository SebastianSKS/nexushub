/* eslint-disable @typescript-eslint/no-explicit-any */
import JSZip from "jszip";
import type { PDFPageProxy } from "pdfjs-dist";
import { baseName, safeFileName } from "@/lib/documents/format";
import type { PdfToWordOptions } from "@/types/documents";
import { DocumentError } from "../errors";
import { getPdfjs, openPdf } from "../pdfjs";
import { abortarSiCancelado, cederHilo, MIME_DOCX, type Ctx, type Salida } from "./comun";

/**
 * PDF → Word dentro de la aplicación, sin programas externos.
 *
 *  - «Texto editable»: pdf.js extrae el texto con su posición, tamaño y estilo (negrita/cursiva) y las
 *    imágenes incrustadas; aquí se reconstruyen líneas, párrafos, títulos e imágenes en su orden de lectura
 *    y se escriben como un .docx editable.
 *  - «Fiel al diseño»: cada página se dibuja como imagen (idéntica al PDF) dentro del Word. No hay OCR.
 */

interface Corrida {
  t: string;
  b: boolean;
  i: boolean;
}
interface Fragmento {
  s: string;
  x: number;
  y: number;
  w: number;
  size: number;
  b: boolean;
  i: boolean;
  familia: string;
}
interface LineaPdf {
  corridas: Corrida[];
  texto: string;
  x: number;
  y: number;
  size: number;
  ancho: number;
  familia: string;
}
interface ImagenPdf {
  /** Posición del borde superior en la página (puntos, origen abajo). */
  y: number;
  ancho: number;
  alto: number;
  bytes: Uint8Array;
  ext: "png" | "jpg";
}
type Elemento = { tipo: "linea"; y: number; l: LineaPdf } | { tipo: "imagen"; y: number; img: ImagenPdf };

type ParrafoDoc =
  | { tipo: "texto"; corridas: Corrida[]; size: number; titulo: boolean; izq: number; saltoPagina: boolean; familia: string }
  | { tipo: "imagen"; img: ImagenPdf; saltoPagina: boolean };

const VINETA = /^\s*([•●◦▪■□–—·o*-]|\d{1,3}[.)]|[a-z][.)])\s+/;
const MAX_IMAGENES = 250;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

function familiaWord(nombre: string): string {
  const n = nombre.replace(/^[A-Z]{6}\+/, "");
  if (/times/i.test(n)) return "Times New Roman";
  if (/courier|consolas|mono/i.test(n)) return "Courier New";
  if (/arial|helvetica/i.test(n)) return "Arial";
  for (const f of ["Calibri", "Cambria", "Verdana", "Tahoma", "Georgia", "Segoe UI", "Trebuchet", "Garamond", "Century"]) {
    if (n.toLowerCase().includes(f.toLowerCase().replace(" ", ""))) return f === "Trebuchet" ? "Trebuchet MS" : f === "Century" ? "Century Gothic" : f;
  }
  return "Calibri";
}

type Matriz = [number, number, number, number, number, number];
const multiplicar = (m: Matriz, n: Matriz): Matriz => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

async function lienzoABytes(lienzo: HTMLCanvasElement, calidad = 0.88): Promise<{ bytes: Uint8Array; ext: "png" | "jpg" } | null> {
  const pequena = lienzo.width * lienzo.height <= 250_000;
  const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, pequena ? "image/png" : "image/jpeg", calidad));
  return blob ? { bytes: new Uint8Array(await blob.arrayBuffer()), ext: pequena ? "png" : "jpg" } : null;
}

/** Convierte el objeto de imagen de pdf.js (bitmap o píxeles) en un archivo PNG/JPEG. */
async function imagenABytes(obj: any): Promise<{ bytes: Uint8Array; ext: "png" | "jpg"; w: number; h: number } | null> {
  try {
    const lienzo = document.createElement("canvas");
    let w = 0;
    let h = 0;
    if (obj.bitmap) {
      w = obj.bitmap.width;
      h = obj.bitmap.height;
      lienzo.width = w;
      lienzo.height = h;
      const c = lienzo.getContext("2d")!;
      c.fillStyle = "#fff";
      c.fillRect(0, 0, w, h);
      c.drawImage(obj.bitmap, 0, 0);
    } else if (obj.data && obj.width && obj.height) {
      w = obj.width;
      h = obj.height;
      lienzo.width = w;
      lienzo.height = h;
      const rgba = new Uint8ClampedArray(w * h * 4);
      const d: Uint8Array | Uint8ClampedArray = obj.data;
      if (obj.kind === 3 || d.length === w * h * 4) rgba.set(d.subarray(0, w * h * 4));
      else if (obj.kind === 2 || d.length === w * h * 3) {
        for (let i = 0, j = 0; i < w * h; i++, j += 3) {
          rgba[i * 4] = d[j]!;
          rgba[i * 4 + 1] = d[j + 1]!;
          rgba[i * 4 + 2] = d[j + 2]!;
          rgba[i * 4 + 3] = 255;
        }
      } else if (obj.kind === 1) {
        const fila = (w + 7) >> 3;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const v = (d[y * fila + (x >> 3)]! >> (7 - (x & 7))) & 1 ? 255 : 0;
          const k = (y * w + x) * 4;
          rgba[k] = rgba[k + 1] = rgba[k + 2] = v;
          rgba[k + 3] = 255;
        }
      } else return null;
      const c = lienzo.getContext("2d")!;
      c.fillStyle = "#fff";
      c.fillRect(0, 0, w, h);
      const tmp = document.createElement("canvas");
      tmp.width = w;
      tmp.height = h;
      tmp.getContext("2d")!.putImageData(new ImageData(rgba, w, h), 0, 0);
      c.drawImage(tmp, 0, 0);
    } else return null;
    const r = await lienzoABytes(lienzo);
    return r ? { ...r, w, h } : null;
  } catch {
    return null;
  }
}

function esperarObjeto(page: PDFPageProxy, nombre: string): Promise<any | null> {
  const almacen: any = nombre.startsWith("g_") ? page.commonObjs : page.objs;
  return new Promise((resolver) => {
    const t = setTimeout(() => resolver(null), 4000);
    try {
      almacen.get(nombre, (o: any) => {
        clearTimeout(t);
        resolver(o ?? null);
      });
    } catch {
      clearTimeout(t);
      resolver(null);
    }
  });
}

/** Une los fragmentos de texto de una página en líneas ordenadas de arriba abajo. */
function agruparLineas(frags: Fragmento[]): LineaPdf[] {
  const ordenados = [...frags].sort((a, b) => b.y - a.y || a.x - b.x);
  const grupos: Fragmento[][] = [];
  for (const f of ordenados) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && Math.abs(ultimo[0]!.y - f.y) < Math.max(f.size, ultimo[0]!.size) * 0.45) ultimo.push(f);
    else grupos.push([f]);
  }
  return grupos
    .map((fs) => {
      fs.sort((a, b) => a.x - b.x);
      const corridas: Corrida[] = [];
      const poner = (t: string, f: Fragmento) => {
        const u = corridas[corridas.length - 1];
        if (u && u.b === f.b && u.i === f.i) u.t += t;
        else corridas.push({ t, b: f.b, i: f.i });
      };
      let acumulado = "";
      let finPrevio = fs[0]!.x;
      for (const f of fs) {
        const hueco = f.x - finPrevio;
        let s = f.s;
        if (acumulado && hueco > f.size * 3.5) s = `\t${s}`;
        else if (acumulado && hueco > f.size * 0.12 && !acumulado.endsWith(" ") && !s.startsWith(" ")) s = ` ${s}`;
        poner(s, f);
        acumulado += s;
        finPrevio = f.x + f.w;
      }
      const conteo = new Map<string, number>();
      for (const f of fs) conteo.set(f.familia, (conteo.get(f.familia) ?? 0) + f.s.length);
      return {
        corridas,
        texto: acumulado.replace(/ {2,}/g, " ").trim(),
        x: fs[0]!.x,
        y: fs[0]!.y,
        size: fs.reduce((m, f) => Math.max(m, f.size), 0),
        ancho: finPrevio - fs[0]!.x,
        familia: [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]![0],
      };
    })
    .filter((l) => l.texto);
}

interface PaginaLeida {
  elementos: Elemento[];
  ancho: number;
  alto: number;
  rutas: number;
  imagenes: number;
}

async function leerPagina(page: PDFPageProxy, lib: Awaited<ReturnType<typeof getPdfjs>>, cuentaImagenes: { n: number }): Promise<PaginaLeida> {
  const vista = page.getViewport({ scale: 1 });
  const OPS = lib.OPS;

  // Operadores: imágenes (con su posición) y cantidad de dibujo vectorial. También carga las fuentes reales.
  const ops = await page.getOperatorList();
  let ctm: Matriz = [1, 0, 0, 1, 0, 0];
  const pila: Matriz[] = [];
  const colocadas: { nombre: string; inline?: any; m: Matriz }[] = [];
  let rutas = 0;
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i]!;
    const a = ops.argsArray[i] as any;
    if (fn === OPS.save) pila.push([...ctm] as Matriz);
    else if (fn === OPS.restore) ctm = pila.pop() ?? ctm;
    else if (fn === OPS.transform) ctm = multiplicar(a as Matriz, ctm);
    else if (fn === OPS.paintImageXObject) colocadas.push({ nombre: a[0], m: [...ctm] as Matriz });
    else if (fn === OPS.paintInlineImageXObject) colocadas.push({ nombre: "", inline: a[0], m: [...ctm] as Matriz });
    else if (fn === OPS.constructPath) rutas++;
  }
  const elementos: Elemento[] = [];
  let imagenes = 0;

  // Algunas imágenes (JPEG decodificados con WebCodecs) no se pueden leer como píxeles: en ese caso se recorta
  // su zona de la página dibujada. Así también salen bien las imágenes con máscara, CMYK o recortes.
  let pagina: { lienzo: HTMLCanvasElement; escala: number } | null = null;
  const recortar = async (m: Matriz): Promise<{ bytes: Uint8Array; ext: "png" | "jpg" } | null> => {
    if (!pagina) {
      const escala = Math.min(3, 2600 / Math.max(vista.width, vista.height));
      const v = page.getViewport({ scale: escala });
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.ceil(v.width);
      lienzo.height = Math.ceil(v.height);
      await page.render({ canvas: lienzo, viewport: v, background: "#ffffff" }).promise;
      pagina = { lienzo, escala };
    }
    const xs = [m[4], m[0] + m[4], m[2] + m[4], m[0] + m[2] + m[4]];
    const ys = [m[5], m[1] + m[5], m[3] + m[5], m[1] + m[3] + m[5]];
    const x0 = Math.max(0, Math.floor(Math.min(...xs) * pagina.escala));
    const x1 = Math.min(pagina.lienzo.width, Math.ceil(Math.max(...xs) * pagina.escala));
    const y0 = Math.max(0, Math.floor((vista.height - Math.max(...ys)) * pagina.escala));
    const y1 = Math.min(pagina.lienzo.height, Math.ceil((vista.height - Math.min(...ys)) * pagina.escala));
    if (x1 - x0 < 8 || y1 - y0 < 8) return null;
    const corte = document.createElement("canvas");
    corte.width = x1 - x0;
    corte.height = y1 - y0;
    corte.getContext("2d")!.drawImage(pagina.lienzo, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
    return lienzoABytes(corte, 0.9);
  };

  for (const c of colocadas) {
    if (cuentaImagenes.n >= MAX_IMAGENES) break;
    const ancho = Math.hypot(c.m[0], c.m[1]);
    const alto = Math.hypot(c.m[2], c.m[3]);
    if (ancho < 14 || alto < 14) continue; // viñetas, iconos diminutos
    const obj = c.inline ?? (await esperarObjeto(page, c.nombre));
    const legible = obj && (obj.data || (obj.bitmap && obj.bitmap.width > 0));
    let r: { bytes: Uint8Array; ext: "png" | "jpg" } | null = legible ? await imagenABytes(obj) : null;
    if (!r) r = await recortar(c.m);
    if (!r) continue;
    cuentaImagenes.n++;
    imagenes++;
    elementos.push({ tipo: "imagen", y: Math.max(c.m[5], c.m[5] + c.m[3]), img: { y: c.m[5], ancho, alto, bytes: r.bytes, ext: r.ext } });
  }

  // Texto, con negrita/cursiva y familia según la fuente real del PDF.
  const contenido = await page.getTextContent();
  const frags: Fragmento[] = [];
  const cacheFuente = new Map<string, { b: boolean; i: boolean; familia: string }>();
  const infoFuente = (id: string) => {
    let f = cacheFuente.get(id);
    if (!f) {
      let nombre = "";
      let b = false;
      let i = false;
      try {
        const o: any = page.commonObjs.has(id) ? page.commonObjs.get(id) : null;
        nombre = String(o?.name ?? o?.fallbackName ?? "");
        b = !!o?.bold || /bold|black|heavy|semibold|demi/i.test(nombre);
        i = !!o?.italic || /italic|oblique/i.test(nombre);
      } catch {
        /* fuente aún sin cargar */
      }
      f = { b, i, familia: familiaWord(nombre) };
      cacheFuente.set(id, f);
    }
    return f;
  };
  for (const it of contenido.items) {
    if (!("str" in it) || !it.str) continue;
    const t = it.transform as number[];
    const f = infoFuente(it.fontName);
    frags.push({ s: it.str, x: t[4]!, y: t[5]!, w: it.width, size: Math.hypot(t[0]!, t[1]!) || it.height || 10, b: f.b, i: f.i, familia: f.familia });
  }
  for (const l of agruparLineas(frags)) elementos.push({ tipo: "linea", y: l.y, l });
  elementos.sort((a, b) => b.y - a.y);

  // PDF escaneado con texto reconocido (OCR): la foto de la página completa va debajo del texto invisible. En Word estorba
  // (ocuparía una página entera antes del texto), así que se quita cuando la página ya tiene texto.
  if (elementos.some((e) => e.tipo === "linea")) {
    for (let i = elementos.length - 1; i >= 0; i--) {
      const e = elementos[i]!;
      if (e.tipo === "imagen" && e.img.ancho * e.img.alto > vista.width * vista.height * 0.8) {
        elementos.splice(i, 1);
        imagenes--;
      }
    }
  }
  // Hay PDF (escaneados, de otros programas) con páginas enormes, en píxeles: Word no admite hojas de más de 22 pulgadas
  // y el texto saldría gigante. Se reduce todo a un tamaño de hoja normal.
  const k = Math.max(vista.width, vista.height) > 1200 ? 842 / Math.max(vista.width, vista.height) : 1;
  if (k !== 1) {
    for (const e of elementos) {
      e.y *= k;
      if (e.tipo === "linea") {
        e.l.x *= k;
        e.l.y *= k;
        e.l.size *= k;
        e.l.ancho *= k;
      } else {
        e.img.y *= k;
        e.img.ancho *= k;
        e.img.alto *= k;
      }
    }
  }
  return { elementos, ancho: vista.width * k, alto: vista.height * k, rutas, imagenes };
}

const CT_MEDIA = { png: "image/png", jpg: "image/jpeg" } as const;

export async function pdfAWord(file: File, opts: PdfToWordOptions, ctx: Ctx): Promise<Salida[]> {
  ctx.report(0.02, `Abriendo ${file.name}`);
  const lib = await getPdfjs();
  const { doc, destroy } = await openPdf(file);
  try {
    const total = doc.numPages;
    const paginas: PaginaLeida[] = [];
    const fielImgs: { img: ImagenPdf; ancho: number; alto: number }[] = [];
    const cuenta = { n: 0 };

    for (let n = 1; n <= total; n++) {
      abortarSiCancelado(ctx.signal);
      const page = await doc.getPage(n);
      if (opts.mode === "fiel") {
        ctx.report(0.05 + (n / total) * 0.75, `Dibujando la página ${n} de ${total}`);
        const vista0 = page.getViewport({ scale: 1 });
        const escala = Math.min(2.2, 2200 / Math.max(vista0.width, vista0.height));
        const vista = page.getViewport({ scale: escala });
        const lienzo = document.createElement("canvas");
        lienzo.width = Math.ceil(vista.width);
        lienzo.height = Math.ceil(vista.height);
        await page.render({ canvas: lienzo, viewport: vista, background: "#ffffff" }).promise;
        const r = await lienzoABytes(lienzo, 0.9);
        if (!r) throw new DocumentError(`No se pudo dibujar la página ${n}.`, "Prueba con el modo «Texto editable».");
        const k = Math.max(vista0.width, vista0.height) > 1200 ? 842 / Math.max(vista0.width, vista0.height) : 1; // Word no admite hojas gigantes
        fielImgs.push({ img: { y: 0, ancho: vista0.width * k, alto: vista0.height * k, bytes: r.bytes, ext: r.ext }, ancho: vista0.width * k, alto: vista0.height * k });
      } else {
        ctx.report(0.05 + (n / total) * 0.6, `Leyendo la página ${n} de ${total}`);
        paginas.push(await leerPagina(page, lib, cuenta));
      }
      page.cleanup();
      await cederHilo();
    }

    // --- Armado del contenido -----------------------------------------------------------------
    const parrafos: ParrafoDoc[] = [];
    let ancho = 595.28;
    let alto = 841.89;
    const advertencias: string[] = [];

    if (opts.mode === "fiel") {
      ancho = fielImgs[0]!.ancho;
      alto = fielImgs[0]!.alto;
      fielImgs.forEach((f, i) => parrafos.push({ tipo: "imagen", img: f.img, saltoPagina: i > 0 && false }));
      advertencias.push("Cada página del PDF se insertó como una imagen: se ve idéntica al original, pero el texto no se puede editar. Para obtener texto editable elige «Texto editable».");
    } else {
      ancho = paginas[0]!.ancho;
      alto = paginas[0]!.alto;
      const lineasTotales = paginas.flatMap((p) => p.elementos.filter((e): e is Extract<Elemento, { tipo: "linea" }> => e.tipo === "linea").map((e) => e.l));
      const hayImagenes = paginas.some((p) => p.imagenes > 0);
      if (lineasTotales.length === 0 && !hayImagenes) {
        throw new DocumentError(
          `«${file.name}» no contiene texto ni imágenes que se puedan pasar como contenido editable.`,
          "Parece un documento de páginas dibujadas o escaneadas. Elige el modo «Fiel al diseño» para conservarlas como imágenes. Nexo no incluye reconocimiento de texto (OCR).",
        );
      }
      const peso = new Map<number, number>();
      for (const l of lineasTotales) peso.set(Math.round(l.size), (peso.get(Math.round(l.size)) ?? 0) + l.texto.length);
      const cuerpo = lineasTotales.length ? [...peso.entries()].sort((a, b) => b[1] - a[1])[0]![0] : 11;

      ctx.report(0.72, "Armando los párrafos");
      for (let pi = 0; pi < paginas.length; pi++) {
        const { elementos } = paginas[pi]!;
        if (elementos.length === 0) continue;
        const lineas = elementos.filter((e): e is Extract<Elemento, { tipo: "linea" }> => e.tipo === "linea").map((e) => e.l);
        const margenIzq = lineas.length ? Math.min(...lineas.map((l) => l.x)) : 0;
        const anchoMax = lineas.length ? Math.max(...lineas.map((l) => l.ancho)) : 0;
        let actual: Extract<ParrafoDoc, { tipo: "texto" }> | null = null;
        let previa: LineaPdf | null = null;
        let primero = true;

        for (const el of elementos) {
          if (el.tipo === "imagen") {
            parrafos.push({ tipo: "imagen", img: el.img, saltoPagina: primero && pi > 0 });
            primero = false;
            actual = null;
            previa = null;
            continue;
          }
          const l = el.l;
          const titulo = l.size >= cuerpo * 1.25;
          const izq = Math.max(0, l.x - margenIzq);
          const nueva =
            !actual ||
            !previa ||
            titulo ||
            actual.titulo ||
            VINETA.test(l.texto) ||
            previa.y - l.y > Math.max(previa.size, l.size) * 1.55 ||
            Math.abs(l.size - previa.size) > previa.size * 0.18 ||
            (previa.ancho < anchoMax * 0.55 && /[.:;!?]$/.test(previa.texto)) ||
            Math.abs(l.x - previa.x) > cuerpo * 3;
          if (nueva) {
            actual = { tipo: "texto", corridas: l.corridas.map((c) => ({ ...c })), size: l.size, titulo, izq: izq > 18 ? izq : 0, saltoPagina: primero && pi > 0, familia: l.familia };
            parrafos.push(actual);
          } else if (actual) {
            const ult = actual.corridas[actual.corridas.length - 1]!;
            const unir = /[a-záéíóúñ]-$/i.test(ult.t) && /^[a-záéíóúñ]/.test(l.texto);
            if (unir) ult.t = ult.t.slice(0, -1);
            const [primera, ...resto] = l.corridas.map((c) => ({ ...c }));
            if (primera) {
              if (!unir) primera.t = ` ${primera.t.replace(/^\s+/, "")}`;
              if (primera.b === ult.b && primera.i === ult.i) ult.t += primera.t;
              else actual.corridas.push(primera);
              actual.corridas.push(...resto);
            }
          }
          previa = l;
          primero = false;
        }
      }

      const conGraficos = paginas.filter((p) => p.rutas > 30 && p.imagenes === 0).length;
      if (conGraficos > 0 || (lineasTotales.length < 40 && paginas.some((p) => p.rutas > 30))) {
        advertencias.push("Este PDF contiene gráficos dibujados (formas, líneas, diagramas o fondos) que no se pueden pasar a Word como objetos. Si son importantes, vuelve a convertirlo con «Fiel al diseño».");
      }
      if (lineasTotales.length === 0) advertencias.push("El PDF no tiene texto seleccionable, solo imágenes: se incluyeron las imágenes. Nexo no incluye reconocimiento de texto (OCR).");
      advertencias.push("Se recuperan el texto (con negrita, cursiva y tamaño), los títulos, los párrafos y las imágenes. No se reconstruyen tablas, columnas ni encabezados y pies de página, y los colores del texto no se conservan: revisa el resultado antes de usarlo.");
    }

    // --- Documento Word ----------------------------------------------------------------------------
    ctx.report(0.85, "Escribiendo el documento de Word");
    const fiel = opts.mode === "fiel";
    const margenPt = fiel ? 0 : 56.7;
    const anchoUtil = ancho - margenPt * 2;
    const altoUtil = alto - margenPt * 2 - (fiel ? 6 : 0);
    const zip = new JSZip();
    const rels: string[] = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'];
    let nImg = 0;

    const cuerpoXml = parrafos
      .map((p) => {
        if (p.tipo === "imagen") {
          nImg++;
          const id = `rIdImg${nImg}`;
          const nombre = `imagen${nImg}.${p.img.ext}`;
          zip.file(`word/media/${nombre}`, p.img.bytes);
          rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${nombre}"/>`);
          const escala = Math.min(anchoUtil / p.img.ancho, altoUtil / p.img.alto, 1 + (fiel ? 1 : 0));
          const cx = Math.round(p.img.ancho * escala * 12700);
          const cy = Math.round(p.img.alto * escala * 12700);
          const ppr = `<w:pPr>${p.saltoPagina ? "<w:pageBreakBefore/>" : ""}<w:spacing w:before="${fiel ? 0 : 120}" w:after="${fiel ? 0 : 120}" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>`;
          const dibujo = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${nImg}" name="Imagen ${nImg}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${nImg}" name="${nombre}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
          return `<w:p>${ppr}<w:r>${dibujo}</w:r></w:p>`;
        }
        const sz = Math.min(144, Math.max(16, Math.round(p.size * 2)));
        const ppr = `<w:pPr>${p.saltoPagina ? "<w:pageBreakBefore/>" : ""}${p.izq ? `<w:ind w:left="${Math.round(p.izq * 20)}"/>` : ""}</w:pPr>`;
        const runs = p.corridas
          .map((c) => {
            const partes = c.t.split("\t").map((t) => (t ? `<w:t xml:space="preserve">${esc(t)}</w:t>` : "")).join("<w:tab/>");
            return `<w:r><w:rPr><w:rFonts w:ascii="${p.familia}" w:hAnsi="${p.familia}" w:cs="${p.familia}"/>${p.titulo || c.b ? "<w:b/>" : ""}${c.i ? "<w:i/>" : ""}<w:sz w:val="${sz}"/></w:rPr>${partes}</w:r>`;
          })
          .join("");
        return `<w:p>${ppr}${runs}</w:p>`;
      })
      .join("");

    const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
    const usa = new Set<string>();
    for (const p of parrafos) if (p.tipo === "imagen") usa.add(p.img.ext);
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[...usa].map((e) => `<Default Extension="${e}" ContentType="${CT_MEDIA[e as "png" | "jpg"]}"/>`).join("")}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    );
    zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`);
    zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`);
    const mg = Math.round(margenPt * 20);
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${cuerpoXml}<w:sectPr><w:pgSz w:w="${Math.round(ancho * 20)}" w:h="${Math.round(alto * 20)}"/><w:pgMar w:top="${mg}" w:right="${mg}" w:bottom="${mg}" w:left="${mg}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`,
    );

    ctx.report(0.93, "Comprimiendo el documento");
    const blob = await zip.generateAsync({ type: "blob", mimeType: MIME_DOCX, compression: "DEFLATE" });
    for (const a of advertencias) ctx.warn(a);
    return [{ name: safeFileName(`${baseName(file.name)}.docx`), blob, mime: MIME_DOCX }];
  } finally {
    await destroy();
  }
}
