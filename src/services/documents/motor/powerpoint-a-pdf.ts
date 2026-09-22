import type JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { baseName, safeFileName } from "@/lib/documents/format";
import { DocumentError } from "../errors";
import { abortarSiCancelado, cederHilo, MIME_PDF, pdfBlob, type Ctx, type Salida } from "./comun";
import { abrirOoxml, crearLimpiador, leerXml, lista, relaciones, texto } from "./ooxml";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Color = { r: number; g: number; b: number };
const EMU = 12700; // 1 pt = 12700 EMU
const NEGRO: Color = { r: 0, g: 0, b: 0 };
const BLANCO: Color = { r: 1, g: 1, b: 1 };

// --- Color ------------------------------------------------------------------

function hexAColor(hex: string): Color {
  const n = parseInt(hex.slice(0, 6), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function rgbAHsl({ r, g, b }: Color): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslARgb(h: number, s: number, l: number): Color {
  if (s === 0) return { r: l, g: l, b: l };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    return u < 1 / 6 ? p + (q - p) * 6 * u : u < 1 / 2 ? q : u < 2 / 3 ? p + (q - p) * (2 / 3 - u) * 6 : p;
  };
  return { r: f(h + 1 / 3), g: f(h), b: f(h - 1 / 3) };
}

interface Tema {
  colores: Record<string, Color>;
  mapa: Record<string, string>;
}

/** Color de un nodo de relleno (solidFill): srgbClr, schemeClr o sysClr, con lumMod/lumOff. */
function resolverColor(nodo: any, tema: Tema): Color | null {
  if (!nodo) return null;
  let base: Color | null = null;
  let mods: any = null;
  if (nodo.srgbClr) {
    base = hexAColor(String(nodo.srgbClr["@_val"]));
    mods = nodo.srgbClr;
  } else if (nodo.schemeClr) {
    const nombre = String(nodo.schemeClr["@_val"]);
    base = tema.colores[tema.mapa[nombre] ?? nombre] ?? null;
    mods = nodo.schemeClr;
  } else if (nodo.sysClr) {
    base = hexAColor(String(nodo.sysClr["@_lastClr"] ?? "000000"));
  }
  if (!base) return null;
  const lumMod = mods?.lumMod ? Number(mods.lumMod["@_val"]) / 100000 : 1;
  const lumOff = mods?.lumOff ? Number(mods.lumOff["@_val"]) / 100000 : 0;
  if (lumMod !== 1 || lumOff !== 0) {
    const [h, s, l] = rgbAHsl(base);
    base = hslARgb(h, s, Math.min(1, Math.max(0, l * lumMod + lumOff)));
  }
  return base;
}

// --- Geometría --------------------------------------------------------------

interface Caja {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Transformacion {
  ox: number;
  oy: number;
  sx: number;
  sy: number;
}
const IDENTIDAD: Transformacion = { ox: 0, oy: 0, sx: 1, sy: 1 };

function leerXfrm(x: any): Caja | null {
  if (!x?.off || !x?.ext) return null;
  return { x: Number(x.off["@_x"]), y: Number(x.off["@_y"]), w: Number(x.ext["@_cx"]), h: Number(x.ext["@_cy"]) };
}
function aplicar(c: Caja, t: Transformacion): Caja {
  return { x: t.ox + c.x * t.sx, y: t.oy + c.y * t.sy, w: c.w * t.sx, h: c.h * t.sy };
}

// --- Texto ------------------------------------------------------------------

interface Corrida {
  t: string;
  b: boolean;
  i: boolean;
  sz: number;
  color: Color;
}
interface Parrafo {
  corridas: Corrida[];
  algn: "l" | "ctr" | "r" | "just";
  bullet: string | null;
  marL: number;
}
interface Fuentes {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}
interface Tramo {
  t: string;
  font: PDFFont;
  size: number;
  color: Color;
  w: number;
}
interface Linea {
  tramos: Tramo[];
  w: number;
  alto: number;
  parrafo: Parrafo;
  primera: boolean;
}

const fuenteDe = (f: Fuentes, b: boolean, i: boolean) => (b && i ? f.boldItalic : b ? f.bold : i ? f.italic : f.regular);

function maquetar(parrafos: Parrafo[], ancho: number, escala: number, f: Fuentes, limpiar: (s: string) => string): Linea[] {
  const lineas: Linea[] = [];
  for (const p of parrafos) {
    const sangria = p.marL + (p.bullet ? 0 : 0);
    const util = Math.max(20, ancho - sangria);
    let actual: Linea = { tramos: [], w: 0, alto: 0, parrafo: p, primera: true };
    const cerrar = (vacia = false) => {
      if (actual.tramos.length || vacia) {
        if (actual.alto === 0) actual.alto = (p.corridas[0]?.sz ?? 18) * escala * 1.2;
        lineas.push(actual);
      }
      actual = { tramos: [], w: 0, alto: 0, parrafo: p, primera: false };
    };
    if (p.corridas.every((c) => !c.t.trim())) {
      cerrar(true);
      continue;
    }
    for (const c of p.corridas) {
      const size = Math.max(4, c.sz * escala);
      const font = fuenteDe(f, c.b, c.i);
      for (const palabra of limpiar(c.t).split(/(?<= )/)) {
        const w = font.widthOfTextAtSize(palabra, size);
        if (actual.w + w > util && actual.tramos.length > 0) cerrar();
        if (actual.tramos.length === 0 && palabra.trim() === "") continue;
        actual.tramos.push({ t: palabra, font, size, color: c.color, w });
        actual.w += w;
        actual.alto = Math.max(actual.alto, size * 1.2);
      }
    }
    cerrar();
  }
  return lineas;
}

// --- Documento --------------------------------------------------------------

interface Contexto {
  doc: PDFDocument;
  zip: JSZip;
  fuentes: Fuentes;
  limpiar: (s: string) => string;
  tema: Tema;
  estilos: any;
  cache: Map<string, PDFImage | null>;
  omitidas: number;
}

interface Herencia {
  layout: any;
  master: any;
}

async function incrustarImagen(cx: Contexto, ruta: string): Promise<PDFImage | null> {
  if (cx.cache.has(ruta)) return cx.cache.get(ruta)!;
  let img: PDFImage | null = null;
  const f = cx.zip.file(ruta);
  if (f) {
    const bytes = await f.async("uint8array");
    const ext = ruta.slice(ruta.lastIndexOf(".") + 1).toLowerCase();
    try {
      if (ext === "png") img = await cx.doc.embedPng(bytes);
      else if (ext === "jpg" || ext === "jpeg") img = await cx.doc.embedJpg(bytes);
      else if (ext === "gif" || ext === "bmp" || ext === "webp") {
        const bmp = await createImageBitmap(new Blob([bytes as BlobPart]));
        const lienzo = document.createElement("canvas");
        lienzo.width = bmp.width;
        lienzo.height = bmp.height;
        lienzo.getContext("2d")!.drawImage(bmp, 0, 0);
        bmp.close();
        const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, "image/png"));
        if (blob) img = await cx.doc.embedPng(new Uint8Array(await blob.arrayBuffer()));
      }
    } catch {
      img = null;
    }
  }
  if (!img) cx.omitidas++;
  cx.cache.set(ruta, img);
  return img;
}

/** Busca el marcador (placeholder) equivalente en la plantilla: por índice y, si no, por tipo. */
function buscarMarcador(spTree: any, ph: any): any | null {
  if (!spTree || !ph) return null;
  const idx = ph["@_idx"];
  const tipo = ph["@_type"];
  const candidatos = lista<any>(spTree.sp);
  return (
    candidatos.find((s) => idx !== undefined && s.nvSpPr?.nvPr?.ph?.["@_idx"] === idx) ??
    candidatos.find((s) => tipo !== undefined && s.nvSpPr?.nvPr?.ph?.["@_type"] === tipo) ??
    (tipo === undefined && idx === undefined ? candidatos.find((s) => s.nvSpPr?.nvPr?.ph && !s.nvSpPr.nvPr.ph["@_type"]) : null) ??
    null
  );
}

function tamanoPorDefecto(ph: any, nivel: number, cx: Contexto, marcLayout: any): number {
  const deLayout = marcLayout?.txBody?.lstStyle?.[`lvl${nivel}pPr`]?.defRPr?.["@_sz"];
  if (deLayout) return Number(deLayout) / 100;
  const tipo = ph?.["@_type"];
  const estilo = tipo === "title" || tipo === "ctrTitle" ? "titleStyle" : ph ? "bodyStyle" : "otherStyle";
  const s = cx.estilos?.[estilo]?.[`lvl${nivel}pPr`]?.defRPr?.["@_sz"];
  if (s) return Number(s) / 100;
  return tipo === "ctrTitle" ? 40 : tipo === "title" ? 32 : tipo === "subTitle" ? 24 : 18;
}

function leerParrafos(txBody: any, ph: any, cx: Contexto, marcLayout: any, colorDef: Color): Parrafo[] {
  const salida: Parrafo[] = [];
  const cuerpo = ph && ph["@_type"] !== "title" && ph["@_type"] !== "ctrTitle" && ph["@_type"] !== "subTitle" && ph["@_type"] !== "sldNum" && ph["@_type"] !== "ftr" && ph["@_type"] !== "dt";
  for (const p of lista<any>(txBody?.p)) {
    const pPr = p.pPr ?? {};
    const nivel = Number(pPr["@_lvl"] ?? 0) + 1;
    const base = tamanoPorDefecto(ph, nivel, cx, marcLayout);
    const corridas: Corrida[] = [];
    const piezas = [...lista<any>(p.r), ...lista<any>(p.fld)];
    for (const r of piezas) {
      const t = texto(r.t);
      if (!t) continue;
      const rPr = r.rPr ?? {};
      corridas.push({
        t,
        b: rPr["@_b"] === "1" || rPr["@_b"] === "true",
        i: rPr["@_i"] === "1" || rPr["@_i"] === "true",
        sz: rPr["@_sz"] ? Number(rPr["@_sz"]) / 100 : base,
        color: resolverColor(rPr.solidFill, cx.tema) ?? colorDef,
      });
    }
    const estiloMaster = ph?.["@_type"] === "title" || ph?.["@_type"] === "ctrTitle" ? "titleStyle" : ph ? "bodyStyle" : "otherStyle";
    const algnCrudo = pPr["@_algn"] ?? marcLayout?.txBody?.lstStyle?.[`lvl${nivel}pPr`]?.["@_algn"] ?? cx.estilos?.[estiloMaster]?.[`lvl${nivel}pPr`]?.["@_algn"];
    let bullet: string | null = null;
    if (pPr.buNone === undefined) {
      if (pPr.buChar) bullet = String(pPr.buChar["@_char"] ?? "•");
      else if (pPr.buAutoNum) bullet = "•";
      else if (cuerpo) bullet = String(cx.estilos?.bodyStyle?.[`lvl${nivel}pPr`]?.buChar?.["@_char"] ?? "") || null;
    }
    const marL = pPr["@_marL"] !== undefined ? Number(pPr["@_marL"]) / EMU : bullet ? 14 * nivel : 0;
    salida.push({ corridas, algn: algnCrudo === "ctr" || algnCrudo === "r" || algnCrudo === "just" ? algnCrudo : "l", bullet: bullet && bullet.length <= 2 ? (bullet === "§" || bullet === "Ø" || bullet === "•" ? "•" : bullet) : bullet ? "•" : null, marL });
  }
  return salida;
}

function dibujarTexto(pagina: PDFPage, parrafos: Parrafo[], caja: Caja, altoPag: number, anclaje: string, cx: Contexto, insets = { l: 7.2, r: 7.2, t: 3.6, b: 3.6 }) {
  if (parrafos.every((p) => p.corridas.every((c) => !c.t.trim()))) return;
  const ancho = caja.w - insets.l - insets.r;
  const alto = caja.h - insets.t - insets.b;
  // Si el texto no cabe en su cuadro, se reduce hasta que quepa (como el «ajustar texto» de PowerPoint).
  let escala = 1;
  let lineas = maquetar(parrafos, ancho, escala, cx.fuentes, cx.limpiar);
  const altoTotal = (ls: Linea[]) => ls.reduce((s, l) => s + l.alto, 0);
  while (altoTotal(lineas) > alto && escala > 0.45) {
    escala -= 0.05;
    lineas = maquetar(parrafos, ancho, escala, cx.fuentes, cx.limpiar);
  }
  const total = altoTotal(lineas);
  let y = anclaje === "ctr" ? caja.y + insets.t + (alto - total) / 2 : anclaje === "b" ? caja.y + caja.h - insets.b - total : caja.y + insets.t;
  for (const l of lineas) {
    const p = l.parrafo;
    const x0 = caja.x + insets.l + p.marL;
    const base = altoPag - (y + l.alto * 0.8);
    let x = p.algn === "ctr" ? x0 + (ancho - p.marL - l.w) / 2 : p.algn === "r" ? x0 + ancho - p.marL - l.w : x0;
    if (l.primera && p.bullet && l.tramos[0]) {
      const t0 = l.tramos[0];
      pagina.drawText(cx.limpiar(p.bullet), { x: x0 - Math.min(p.marL, t0.size * 0.9), y: base, size: t0.size, font: cx.fuentes.regular, color: rgb(t0.color.r, t0.color.g, t0.color.b) });
    }
    for (const t of l.tramos) {
      pagina.drawText(t.t, { x, y: base, size: t.size, font: t.font, color: rgb(t.color.r, t.color.g, t.color.b) });
      x += t.w;
    }
    y += l.alto;
  }
}

async function dibujarArbol(pagina: PDFPage, arbol: any, tr: Transformacion, cx: Contexto, rels: Record<string, { ruta: string }>, her: Herencia, ancho: number, alto: number, colorTexto: Color) {
  // Imágenes primero, luego formas y texto, después tablas: el orden exacto de apilamiento no se conserva.
  for (const pic of lista<any>(arbol.pic)) {
    const caja = leerXfrm(pic.spPr?.xfrm);
    const rid = pic.blipFill?.blip?.["@_embed"];
    if (!caja || !rid || !rels[rid]) continue;
    const img = await incrustarImagen(cx, rels[rid]!.ruta);
    if (!img) continue;
    const c = aplicar(caja, tr);
    pagina.drawImage(img, { x: c.x / EMU, y: alto - (c.y + c.h) / EMU, width: c.w / EMU, height: c.h / EMU });
  }

  for (const sp of lista<any>(arbol.sp)) {
    const ph = sp.nvSpPr?.nvPr?.ph;
    const marcLayout = buscarMarcador(her.layout?.sldLayout?.cSld?.spTree, ph);
    const marcMaster = buscarMarcador(her.master?.sldMaster?.cSld?.spTree, ph);
    const caja0 = leerXfrm(sp.spPr?.xfrm) ?? leerXfrm(marcLayout?.spPr?.xfrm) ?? leerXfrm(marcMaster?.spPr?.xfrm);
    if (!caja0) continue;
    const c = aplicar(caja0, tr);
    const cajaPt: Caja = { x: c.x / EMU, y: c.y / EMU, w: c.w / EMU, h: c.h / EMU };
    const relleno = resolverColor(sp.spPr?.solidFill, cx.tema);
    if (relleno) pagina.drawRectangle({ x: cajaPt.x, y: alto - cajaPt.y - cajaPt.h, width: cajaPt.w, height: cajaPt.h, color: rgb(relleno.r, relleno.g, relleno.b) });
    const parrafos = leerParrafos(sp.txBody, ph, cx, marcLayout, colorTexto);
    const body = sp.txBody?.bodyPr ?? {};
    const ins = { l: body["@_lIns"] !== undefined ? Number(body["@_lIns"]) / EMU : 7.2, r: body["@_rIns"] !== undefined ? Number(body["@_rIns"]) / EMU : 7.2, t: body["@_tIns"] !== undefined ? Number(body["@_tIns"]) / EMU : 3.6, b: body["@_bIns"] !== undefined ? Number(body["@_bIns"]) / EMU : 3.6 };
    const anclaje = String(body["@_anchor"] ?? marcLayout?.txBody?.bodyPr?.["@_anchor"] ?? (ph?.["@_type"] === "ctrTitle" ? "ctr" : "t"));
    dibujarTexto(pagina, parrafos, cajaPt, alto, anclaje, cx, ins);
  }

  for (const gf of lista<any>(arbol.graphicFrame)) {
    const tbl = gf.graphic?.graphicData?.tbl;
    const caja = leerXfrm(gf.xfrm);
    if (!tbl || !caja) continue;
    const c = aplicar(caja, tr);
    const x0 = c.x / EMU;
    let y0 = c.y / EMU;
    const anchos = lista<any>(tbl.tblGrid?.gridCol).map((g) => (Number(g["@_w"]) / EMU) * tr.sx);
    for (const fila of lista<any>(tbl.tr)) {
      const h = (Number(fila["@_h"]) / EMU) * tr.sy;
      let x = x0;
      lista<any>(fila.tc).forEach((tc, i) => {
        const w = anchos[i] ?? 60;
        pagina.drawRectangle({ x, y: alto - y0 - h, width: w, height: h, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5 });
        dibujarTexto(pagina, leerParrafos(tc.txBody, null, cx, null, colorTexto).map((p) => ({ ...p, corridas: p.corridas.map((k) => ({ ...k, sz: Math.min(k.sz, 14) })) })), { x, y: y0, w, h }, alto, "ctr", cx, { l: 4, r: 4, t: 2, b: 2 });
        x += w;
      });
      y0 += h;
    }
  }

  for (const g of lista<any>(arbol.grpSp)) {
    const x = g.grpSpPr?.xfrm;
    const caja = leerXfrm(x);
    const hijos = x?.chOff && x?.chExt ? { x: Number(x.chOff["@_x"]), y: Number(x.chOff["@_y"]), w: Number(x.chExt["@_cx"]), h: Number(x.chExt["@_cy"]) } : null;
    let t = tr;
    if (caja && hijos && hijos.w && hijos.h) {
      const c = aplicar(caja, tr);
      const sx = c.w / hijos.w;
      const sy = c.h / hijos.h;
      t = { ox: c.x - hijos.x * sx, oy: c.y - hijos.y * sy, sx, sy };
    }
    await dibujarArbol(pagina, g, t, cx, rels, her, ancho, alto, colorTexto);
  }
}

export async function powerpointAPdf(file: File, ctx: Ctx): Promise<Salida[]> {
  ctx.report(0.03, `Leyendo ${file.name}`);
  const zip = await abrirOoxml(file, "presentación de PowerPoint");
  const pres = await leerXml(zip, "ppt/presentation.xml");
  if (!pres?.presentation) throw new DocumentError(`«${file.name}» no parece una presentación de PowerPoint (.pptx).`, "Comprueba que sea un .pptx y no un .ppt antiguo.");

  const sz = pres.presentation.sldSz;
  const anchoPt = Number(sz?.["@_cx"] ?? 9144000) / EMU;
  const altoPt = Number(sz?.["@_cy"] ?? 6858000) / EMU;
  const relsPres = await relaciones(zip, "ppt/presentation.xml");
  const crudo = (await zip.file("ppt/presentation.xml")!.async("string")).match(/<p:sldId\b[^>]*>/g) ?? [];
  const diapositivas = crudo.map((tag) => /r:id="([^"]+)"/.exec(tag)?.[1]).filter((id): id is string => !!id && !!relsPres[id]).map((id) => relsPres[id]!.ruta);
  if (diapositivas.length === 0) throw new DocumentError(`«${file.name}» no tiene diapositivas.`, "Comprueba que la presentación no esté vacía.");

  // Tema y estilos de texto del patrón
  const temaXml = await leerXml(zip, "ppt/theme/theme1.xml");
  const esquema = temaXml?.theme?.themeElements?.clrScheme ?? {};
  const colores: Record<string, Color> = {};
  for (const clave of ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"]) {
    const n = esquema[clave];
    if (n?.srgbClr) colores[clave] = hexAColor(String(n.srgbClr["@_val"]));
    else if (n?.sysClr) colores[clave] = hexAColor(String(n.sysClr["@_lastClr"] ?? (clave === "dk1" ? "000000" : "FFFFFF")));
  }

  const doc = await PDFDocument.create();
  const fuentes: Fuentes = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const limp = crearLimpiador(fuentes.regular);
  const cx: Contexto = { doc, zip, fuentes, limpiar: (s) => limp.limpiar(s), tema: { colores, mapa: {} }, estilos: null, cache: new Map(), omitidas: 0 };

  for (let d = 0; d < diapositivas.length; d++) {
    abortarSiCancelado(ctx.signal);
    ctx.report(0.08 + (d / diapositivas.length) * 0.88, `Diapositiva ${d + 1} de ${diapositivas.length}`);
    await cederHilo();

    const rutaSlide = diapositivas[d]!;
    const slide = await leerXml(zip, rutaSlide);
    const rels = await relaciones(zip, rutaSlide);
    const rutaLayout = Object.values(rels).find((r) => r.tipo === "slideLayout")?.ruta;
    const layout = rutaLayout ? await leerXml(zip, rutaLayout) : null;
    const relsLayout = rutaLayout ? await relaciones(zip, rutaLayout) : {};
    const rutaMaster = Object.values(relsLayout).find((r) => r.tipo === "slideMaster")?.ruta;
    const master = rutaMaster ? await leerXml(zip, rutaMaster) : null;
    const relsMaster = rutaMaster ? await relaciones(zip, rutaMaster) : {};

    // Mapa de colores del patrón (p. ej. tx1 → dk1) y estilos de texto
    const mapa = master?.sldMaster?.clrMap ?? {};
    cx.tema = { colores, mapa: { tx1: mapa["@_tx1"] ?? "dk1", tx2: mapa["@_tx2"] ?? "dk2", bg1: mapa["@_bg1"] ?? "lt1", bg2: mapa["@_bg2"] ?? "lt2" } };
    cx.estilos = master?.sldMaster?.txStyles ?? null;

    const pagina = doc.addPage([anchoPt, altoPt]);
    const colorTexto = resolverColor({ schemeClr: { "@_val": "tx1" } }, cx.tema) ?? NEGRO;

    // Fondo: de la diapositiva, del diseño o del patrón
    const fondoNodo = slide?.sld?.cSld?.bg ?? layout?.sldLayout?.cSld?.bg ?? master?.sldMaster?.cSld?.bg;
    let fondo: Color = resolverColor({ schemeClr: { "@_val": "bg1" } }, cx.tema) ?? BLANCO;
    let relsFondo = rels;
    if (!slide?.sld?.cSld?.bg) relsFondo = layout?.sldLayout?.cSld?.bg ? relsLayout : relsMaster;
    if (fondoNodo?.bgPr?.solidFill) fondo = resolverColor(fondoNodo.bgPr.solidFill, cx.tema) ?? fondo;
    else if (fondoNodo?.bgRef) fondo = resolverColor(fondoNodo.bgRef, cx.tema) ?? fondo;
    pagina.drawRectangle({ x: 0, y: 0, width: anchoPt, height: altoPt, color: rgb(fondo.r, fondo.g, fondo.b) });
    const rid = fondoNodo?.bgPr?.blipFill?.blip?.["@_embed"];
    if (rid && relsFondo[rid]) {
      const img = await incrustarImagen(cx, relsFondo[rid]!.ruta);
      if (img) pagina.drawImage(img, { x: 0, y: 0, width: anchoPt, height: altoPt });
    }

    // Formas de decoración del patrón/diseño (logotipos, líneas) que no son marcadores de texto
    for (const [fuente, rl] of [[master?.sldMaster?.cSld?.spTree, relsMaster], [layout?.sldLayout?.cSld?.spTree, relsLayout]] as const) {
      if (fuente?.pic) await dibujarArbol(pagina, { pic: fuente.pic }, IDENTIDAD, cx, rl, { layout, master }, anchoPt, altoPt, colorTexto);
    }
    await dibujarArbol(pagina, slide?.sld?.cSld?.spTree ?? {}, IDENTIDAD, cx, rels, { layout, master }, anchoPt, altoPt, colorTexto);
  }

  ctx.report(0.97, "Guardando el PDF");
  const bytes = await doc.save();
  if (cx.omitidas > 0) ctx.warn(`Se omitieron ${cx.omitidas} imagen(es) en un formato que no se puede incrustar (por ejemplo EMF o SVG).`);
  if (limp.sustituidos > 0) ctx.warn("Algunos caracteres fuera del alfabeto latino se sustituyeron por «?».");
  ctx.warn("Se convierten el texto, las imágenes, los fondos y las tablas de cada diapositiva. Las fuentes originales, animaciones, transiciones, gráficos, formas complejas (flechas, WordArt), sombras y notas del orador no se incluyen, y el apilado de objetos puede variar.");
  return [{ name: safeFileName(`${baseName(file.name)}.pdf`), blob: pdfBlob(bytes), mime: MIME_PDF }];
}

