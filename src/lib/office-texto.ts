import JSZip from "jszip";

/**
 * El texto de un documento de Office nuevo (.docx, .xlsx, .pptx), para poder buscar dentro. Son ZIP con XML: aquí solo se
 * sacan las palabras, sin formato. Se reparte en «unidades» que hacen de páginas del buscador:
 *  - Word: trozos de párrafos seguidos (un .docx no sabe en qué página cae cada cosa hasta que se dibuja).
 *  - Excel: una unidad por hoja, con su nombre delante.
 *  - PowerPoint: una unidad por diapositiva.
 */

export type TipoOffice = "word" | "excel" | "powerpoint";

export interface TextoOffice {
  tipo: TipoOffice;
  unidades: string[];
  /** Solo en Excel: el nombre de la hoja de cada unidad. */
  nombres?: string[];
}

/** Cuántos caracteres seguidos de un Word se agrupan en una unidad. */
export const TAMANO_UNIDAD_WORD = 1800;
/** Tope de texto por hoja: una hoja enorme no debe llenar el índice. */
const MAX_CARACTERES_HOJA = 250_000;

export function tipoDeArchivo(nombre: string): TipoOffice | "pdf" | null {
  const ext = /\.([a-z0-9]+)$/i.exec(nombre)?.[1]?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "word";
  if (ext === "xlsx") return "excel";
  if (ext === "pptx") return "powerpoint";
  return null;
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** «&amp;», «&#233;», «&#xE9;»… a su carácter. */
export function decodificarXml(t: string): string {
  return t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return ENTIDADES[e.toLowerCase()] ?? m;
  });
}

const juntar = (t: string) => t.replace(/\s+/g, " ").trim();

/** Lo que hay en las etiquetas de texto `<x:t>…</x:t>` de un trozo de XML, seguido. */
function textos(xml: string, etiqueta = "t"): string {
  const re = new RegExp(`<(?:\\w+:)?${etiqueta}(?:\\s[^>]*)?>([^<]*)</(?:\\w+:)?${etiqueta}>`, "g");
  let salida = "";
  for (const m of xml.matchAll(re)) salida += decodificarXml(m[1] ?? "");
  return salida;
}

/** Un trozo de XML a texto por párrafos: cada `<x:p>` es una línea, y tabulaciones y saltos cuentan como espacio. */
function parrafos(xml: string, etiquetaParrafo: string, etiquetaTexto: string): string[] {
  const conEspacios = xml.replace(/<(?:\w+:)?(?:tab|br)\s*\/>/g, `<w:${etiquetaTexto}> </w:${etiquetaTexto}>`);
  const re = new RegExp(`<(?:\\w+:)?${etiquetaParrafo}[\\s>][\\s\\S]*?</(?:\\w+:)?${etiquetaParrafo}>`, "g");
  const salida: string[] = [];
  for (const m of conEspacios.matchAll(re)) {
    const t = juntar(textos(m[0], etiquetaTexto));
    if (t) salida.push(t);
  }
  return salida;
}

async function leerTexto(zip: JSZip, ruta: string): Promise<string | null> {
  const f = zip.file(ruta);
  return f ? f.async("string") : null;
}

/** Junta párrafos en trozos de unos `tamano` caracteres, sin partir un párrafo (salvo que él solo pase del tamaño). */
export function agruparEnUnidades(parrafosDelDoc: string[], tamano = TAMANO_UNIDAD_WORD): string[] {
  const unidades: string[] = [];
  let actual = "";
  for (const p of parrafosDelDoc) {
    if (actual && actual.length + p.length + 1 > tamano) {
      unidades.push(actual);
      actual = "";
    }
    actual = actual ? `${actual} ${p}` : p;
  }
  if (actual) unidades.push(actual);
  return unidades;
}

export async function textoDeWord(zip: JSZip): Promise<string[]> {
  const cuerpo = await leerTexto(zip, "word/document.xml");
  if (!cuerpo) return [];
  return agruparEnUnidades(parrafos(cuerpo, "p", "t"));
}

/** Los textos compartidos de un libro de Excel, en su orden (las celdas los citan por número). */
function cadenasCompartidas(xml: string): string[] {
  const salida: string[] = [];
  for (const m of xml.matchAll(/<(?:\w+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?si>/g)) salida.push(juntar(textos(m[1] ?? "")));
  return salida;
}

export async function textoDeExcel(zip: JSZip): Promise<{ unidades: string[]; nombres: string[] }> {
  const libro = await leerTexto(zip, "xl/workbook.xml");
  if (!libro) return { unidades: [], nombres: [] };
  const rels = (await leerTexto(zip, "xl/_rels/workbook.xml.rels")) ?? "";
  const destino = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]*)"/.exec(m[0])?.[1];
    const objetivo = /\bTarget="([^"]*)"/.exec(m[0])?.[1];
    if (id && objetivo) destino.set(id, objetivo.replace(/^\/?(xl\/)?/, "xl/"));
  }
  const compartidas = cadenasCompartidas((await leerTexto(zip, "xl/sharedStrings.xml")) ?? "");

  const unidades: string[] = [];
  const nombres: string[] = [];
  for (const h of libro.matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)) {
    const nombre = decodificarXml(/\bname="([^"]*)"/.exec(h[0])?.[1] ?? "");
    const rid = /\br:id="([^"]*)"/.exec(h[0])?.[1] ?? /\bid="([^"]*)"/.exec(h[0])?.[1];
    const ruta = (rid && destino.get(rid)) || null;
    const xml = ruta ? await leerTexto(zip, ruta) : null;
    const valores: string[] = [];
    let largo = 0;
    if (xml) {
      for (const c of xml.matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
        const tipo = /\bt="([^"]*)"/.exec(c[1] ?? "")?.[1];
        const dentro = c[2] ?? "";
        let v = "";
        if (tipo === "s") {
          const i = Number(/<(?:\w+:)?v>([^<]*)</.exec(dentro)?.[1]);
          v = Number.isInteger(i) ? (compartidas[i] ?? "") : "";
        } else if (tipo === "inlineStr") v = juntar(textos(dentro));
        else v = decodificarXml(/<(?:\w+:)?v>([^<]*)</.exec(dentro)?.[1] ?? "");
        if (!v) continue;
        valores.push(v);
        largo += v.length + 1;
        if (largo > MAX_CARACTERES_HOJA) break;
      }
    }
    unidades.push(juntar([nombre, ...valores].join(" ")));
    nombres.push(nombre);
  }
  return { unidades, nombres };
}

export async function textoDePowerPoint(zip: JSZip): Promise<string[]> {
  const diapositivas = Object.keys(zip.files)
    .map((n) => ({ n, num: Number(/^ppt\/slides\/slide(\d+)\.xml$/.exec(n)?.[1]) }))
    .filter((x) => Number.isInteger(x.num))
    .sort((a, b) => a.num - b.num);
  const unidades: string[] = [];
  for (const d of diapositivas) {
    const xml = await leerTexto(zip, d.n);
    unidades.push(xml ? parrafos(xml, "p", "t").join(" ") : "");
  }
  // Se conserva la posición de cada diapositiva aunque alguna no tenga texto (para que «diapositiva 4» sea la 4).
  return unidades;
}

/** El texto de un .docx/.xlsx/.pptx. Lanza si el ZIP no se puede abrir (dañado o con contraseña). */
export async function textoDeOffice(bytes: ArrayBuffer | Uint8Array, tipo: TipoOffice): Promise<TextoOffice> {
  const zip = await JSZip.loadAsync(bytes);
  if (tipo === "excel") return { tipo, ...(await textoDeExcel(zip)) };
  return { tipo, unidades: tipo === "word" ? await textoDeWord(zip) : await textoDePowerPoint(zip) };
}
