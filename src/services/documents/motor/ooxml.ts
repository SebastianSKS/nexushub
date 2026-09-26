import JSZip from "jszip";
import { traducir } from "@/lib/i18n";
import { XMLParser } from "fast-xml-parser";
import type { PDFFont } from "pdf-lib";
import { DocumentError } from "../errors";

/* eslint-disable @typescript-eslint/no-explicit-any -- el XML de Office es estructural y se recorre de forma dinámica */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
});

/** Abre un archivo de Office (.xlsx, .pptx, .docx): es un ZIP con XML dentro. */
export async function abrirOoxml(file: File, tipo: string): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new DocumentError(traducir("«{name}» no se pudo leer como {tipo}.", { name: file.name, tipo }), traducir("El archivo puede estar dañado o protegido con contraseña. Ábrelo y guárdalo de nuevo."));
  }
}

/** Lee y analiza un XML del ZIP; null si no existe. */
export async function leerXml(zip: JSZip, ruta: string): Promise<any | null> {
  const f = zip.file(ruta.replace(/^\//, ""));
  if (!f) return null;
  return parser.parse(await f.async("string"));
}

export function lista<T>(x: T | T[] | undefined | null): T[] {
  if (x === undefined || x === null || (x as unknown) === "") return [];
  return Array.isArray(x) ? x : [x];
}

/** Texto de un nodo que puede ser cadena, {#text} o {"@_xml:space", "#text"}. */
export function texto(n: any): string {
  if (n === undefined || n === null) return "";
  if (typeof n === "string") return n;
  if (typeof n === "object" && "#text" in n) return String(n["#text"]);
  return "";
}

/** Resuelve un destino de relación («../media/a.png», «/ppt/slides/s1.xml») respecto de la carpeta base. */
export function resolverRuta(baseDir: string, destino: string): string {
  if (destino.startsWith("/")) return destino.slice(1);
  const partes = baseDir.split("/").filter(Boolean);
  for (const p of destino.split("/")) {
    if (p === "..") partes.pop();
    else if (p !== ".") partes.push(p);
  }
  return partes.join("/");
}

/** Relaciones de una parte: {rId → ruta absoluta dentro del ZIP}. */
export async function relaciones(zip: JSZip, rutaParte: string): Promise<Record<string, { ruta: string; tipo: string }>> {
  const i = rutaParte.lastIndexOf("/");
  const dir = i >= 0 ? rutaParte.slice(0, i) : "";
  const nombre = i >= 0 ? rutaParte.slice(i + 1) : rutaParte;
  const xml = await leerXml(zip, `${dir}/_rels/${nombre}.rels`);
  const out: Record<string, { ruta: string; tipo: string }> = {};
  for (const r of lista<any>(xml?.Relationships?.Relationship)) {
    if (r["@_TargetMode"] === "External") continue;
    out[r["@_Id"]] = { ruta: resolverRuta(dir, r["@_Target"]), tipo: String(r["@_Type"] ?? "").split("/").pop() ?? "" };
  }
  return out;
}

/**
 * Limpia el texto para las fuentes estándar de PDF (WinAnsi): lo que no cabe se sustituye por «?» y se
 * cuenta, para avisar al usuario.
 */
export function crearLimpiador(font: PDFFont) {
  const soportados = new Set(font.getCharacterSet());
  let sustituidos = 0;
  return {
    limpiar(s: string): string {
      let out = "";
      for (const ch of s.replace(/ /g, " ").replace(/\t/g, "    ").replace(/[\r\n]+/g, " ")) {
        const code = ch.codePointAt(0)!;
        if (soportados.has(code)) out += ch;
        else if (code === 0x2011 || code === 0x2010 || code === 0x2212) out += "-";
        else {
          out += "?";
          sustituidos++;
        }
      }
      return out;
    },
    get sustituidos() {
      return sustituidos;
    },
  };
}

/** Recorta un texto para que quepa en un ancho, añadiendo «…» si hace falta. */
export function recortar(font: PDFFont, s: string, size: number, ancho: number): string {
  if (font.widthOfTextAtSize(s, size) <= ancho) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (font.widthOfTextAtSize(`${s.slice(0, mid)}…`, size) <= ancho) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? `${s.slice(0, lo)}…` : "";
}
