import mammoth from "mammoth/mammoth.browser";
import { traducir } from "@/lib/i18n";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { baseName, extensionOf, safeFileName } from "@/lib/documents/format";
import { DocumentError } from "../errors";

/**
 * Word → PDF dentro de la aplicación: mammoth.js extrae el .docx a HTML y este módulo lo maqueta
 * como PDF con texto vectorial (seleccionable).
 * Soporta párrafos, títulos, negrita/cursiva, listas, tablas e imágenes PNG/JPEG.
 */

interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
}
interface ImageItem {
  image: { bytes: Uint8Array; mime: string };
}
type Inline = Run | ImageItem;

type Block =
  | { type: "text"; runs: Run[]; size: number; indent: number; bullet?: string; after: number; forceBold?: boolean }
  | { type: "image"; bytes: Uint8Array; mime: string }
  | { type: "table"; rows: Run[][][] };

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BODY = 11;
const HEADING_SIZE: Record<string, number> = { H1: 22, H2: 18, H3: 15, H4: 13, H5: 12, H6: 11 };

// --- HTML → bloques ---------------------------------------------------------

function isImage(i: Inline): i is ImageItem {
  return "image" in i;
}

function inlineItems(node: Node, bold: boolean, italic: boolean, out: Inline[]): void {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? "").replace(/\s+/g, " ");
      if (text) out.push({ text, bold, italic });
      return;
    }
    if (!(child instanceof Element)) return;
    const tag = child.tagName;
    if (tag === "BR") out.push({ text: "\n", bold, italic });
    else if (tag === "IMG") {
      const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(child.getAttribute("src") ?? "");
      if (match) {
        const bin = atob(match[2]!);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        out.push({ image: { bytes, mime: match[1]!.toLowerCase() } });
      }
    } else if (tag === "UL" || tag === "OL" || tag === "TABLE") {
      // Los bloques anidados los procesa collectBlocks; aquí se ignoran.
    } else if (tag === "P") {
      // Párrafo dentro de una celda o ítem: se separa del siguiente con un espacio.
      inlineItems(child, bold, italic, out);
      out.push({ text: " ", bold, italic });
    } else {
      inlineItems(child, bold || tag === "STRONG" || tag === "B", italic || tag === "EM" || tag === "I", out);
    }
  });
}

function pushInline(items: Inline[], base: Omit<Extract<Block, { type: "text" }>, "runs" | "type">, blocks: Block[]) {
  let runs: Run[] = [];
  const flush = () => {
    if (runs.some((r) => r.text.trim())) blocks.push({ type: "text", runs, ...base });
    runs = [];
  };
  for (const item of items) {
    if (isImage(item)) {
      flush();
      blocks.push({ type: "image", ...item.image });
    } else runs.push(item);
  }
  flush();
}

function collectBlocks(parent: Element, blocks: Block[], depth = 0): void {
  parent.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim();
      if (text) blocks.push({ type: "text", runs: [{ text, bold: false, italic: false }], size: BODY, indent: 0, after: 6 });
      return;
    }
    if (!(node instanceof Element)) return;
    const tag = node.tagName;

    if (tag in HEADING_SIZE) {
      const items: Inline[] = [];
      inlineItems(node, true, false, items);
      pushInline(items, { size: HEADING_SIZE[tag]!, indent: 0, after: 8, forceBold: true }, blocks);
    } else if (tag === "UL" || tag === "OL") {
      let n = 1;
      node.querySelectorAll(":scope > li").forEach((li) => {
        const items: Inline[] = [];
        inlineItems(li, false, false, items);
        const bullet = tag === "OL" ? `${n++}.` : "•";
        pushInline(items, { size: BODY, indent: 18 * (depth + 1), bullet, after: 3 }, blocks);
        // Listas anidadas: se procesan como bloques propios, un nivel más adentro.
        li.querySelectorAll(":scope > ul, :scope > ol").forEach((nested) => {
          const holder = document.createElement("div");
          holder.appendChild(nested.cloneNode(true));
          collectBlocks(holder, blocks, depth + 1);
        });
      });
    } else if (tag === "TABLE") {
      const rows: Run[][][] = [];
      node.querySelectorAll("tr").forEach((tr) => {
        const cells: Run[][] = [];
        tr.querySelectorAll(":scope > td, :scope > th").forEach((td) => {
          const items: Inline[] = [];
          inlineItems(td, td.tagName === "TH", false, items);
          cells.push(items.filter((i): i is Run => !isImage(i)));
        });
        if (cells.length) rows.push(cells);
      });
      if (rows.length) blocks.push({ type: "table", rows });
    } else if (tag === "P" || tag === "BLOCKQUOTE" || tag === "PRE") {
      const items: Inline[] = [];
      inlineItems(node, false, false, items);
      pushInline(items, { size: BODY, indent: 0, after: 6 }, blocks);
      node.querySelectorAll(":scope > ul, :scope > ol, :scope > table").forEach((child) => {
        const holder = document.createElement("div");
        holder.appendChild(child.cloneNode(true));
        collectBlocks(holder, blocks, depth);
      });
    } else {
      collectBlocks(node, blocks, depth);
    }
  });
}

// --- Maquetación -------------------------------------------------------------

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}
interface Seg {
  text: string;
  font: PDFFont;
}
interface Line {
  segs: Seg[];
  width: number;
}

function pickFont(f: Fonts, bold: boolean, italic: boolean): PDFFont {
  if (bold && italic) return f.boldItalic;
  return bold ? f.bold : italic ? f.italic : f.regular;
}

function layoutRuns(runs: Run[], size: number, maxWidth: number, fonts: Fonts, clean: (s: string) => string, forceBold = false): Line[] {
  const lines: Line[] = [];
  let current: Line = { segs: [], width: 0 };
  const newLine = () => {
    lines.push(current);
    current = { segs: [], width: 0 };
  };

  for (const run of runs) {
    const font = pickFont(fonts, run.bold || forceBold, run.italic);
    if (run.text === "\n") {
      newLine();
      continue;
    }
    for (const word of clean(run.text).split(/(?<= )/)) {
      const w = font.widthOfTextAtSize(word, size);
      if (current.width + w > maxWidth && current.segs.length > 0) newLine();
      // Palabra más larga que la línea: se parte por caracteres.
      if (w > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth && chunk) {
            current.segs.push({ text: chunk, font });
            newLine();
            chunk = "";
          }
          chunk += ch;
        }
        if (chunk) {
          current.segs.push({ text: chunk, font });
          current.width += font.widthOfTextAtSize(chunk, size);
        }
        continue;
      }
      // Sin espacio inicial al comienzo de línea
      const text = current.segs.length === 0 ? word.replace(/^ +/, "") : word;
      if (!text) continue;
      current.segs.push({ text, font });
      current.width += font.widthOfTextAtSize(text, size);
    }
  }
  if (current.segs.length) lines.push(current);
  return lines;
}

export interface DocxConversion {
  blob: Blob;
  name: string;
  warnings: string[];
}

export async function docxToPdfInBrowser(
  file: File,
  onProgress: (fraction: number, message: string) => void,
  signal: AbortSignal,
): Promise<DocxConversion> {
  if (extensionOf(file.name) !== ".docx") {
    throw new DocumentError(
      traducir("«{name}» es un .doc antiguo y Nexo solo lee el formato .docx.", { name: file.name }),
      traducir("Ábrelo en Word y guárdalo como .docx (Archivo → Guardar como), o pídele a quien te lo dio el .docx."),
    );
  }

  onProgress(0.05, `Leyendo ${file.name}`);
  let html: string;
  let messageCount = 0;
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer: await file.arrayBuffer() },
      // Los estilos «Título» y «Subtítulo» (en español o inglés) se tratan como encabezados.
      { styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Título'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh", "p[style-name='Subtítulo'] => h2:fresh"] },
    );
    html = result.value;
    messageCount = result.messages.length;
  } catch {
    throw new DocumentError(traducir("«{name}» no se pudo leer como documento de Word.", { name: file.name }), traducir("Puede estar dañado o protegido con contraseña."));
  }

  const blocks: Block[] = [];
  collectBlocks(new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body, blocks);
  if (blocks.length === 0) {
    throw new DocumentError(traducir("«{name}» no tiene contenido que convertir.", { name: file.name }), traducir("Comprueba que el documento no esté vacío."));
  }

  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  // Las fuentes estándar solo cubren WinAnsi: lo demás se sustituye por "?".
  const supported = new Set(fonts.regular.getCharacterSet());
  let replaced = 0;
  const clean = (s: string) => {
    let out = "";
    for (const ch of s.replace(/ /g, " ").replace(/\t/g, "    ")) {
      const code = ch.codePointAt(0)!;
      if (supported.has(code)) out += ch;
      else {
        out += "?";
        replaced++;
      }
    }
    return out;
  };

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const ensure = (height: number) => {
    if (y - height < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  let skippedImages = 0;
  const ink = rgb(0.1, 0.1, 0.1);

  for (let b = 0; b < blocks.length; b++) {
    if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
    onProgress(0.1 + (b / blocks.length) * 0.85, traducir("Maquetando bloque {b} de {n}", { b: b + 1, n: blocks.length }));
    if (b % 25 === 0) await new Promise((r) => setTimeout(r)); // cede el hilo para que la barra se repinte
    const block = blocks[b]!;

    if (block.type === "text") {
      const lh = block.size * 1.35;
      const x0 = MARGIN + block.indent;
      const lines = layoutRuns(block.runs, block.size, CONTENT_W - block.indent, fonts, clean, block.forceBold);
      lines.forEach((line, i) => {
        ensure(lh);
        y -= lh;
        if (i === 0 && block.bullet) {
          page.drawText(block.bullet, { x: x0 - 14, y, size: block.size, font: fonts.regular, color: ink });
        }
        let x = x0;
        for (const seg of line.segs) {
          page.drawText(seg.text, { x, y, size: block.size, font: seg.font, color: ink });
          x += seg.font.widthOfTextAtSize(seg.text, block.size);
        }
      });
      y -= block.after;
    } else if (block.type === "image") {
      let image: PDFImage | null = null;
      try {
        if (block.mime === "image/png") image = await doc.embedPng(block.bytes);
        else if (block.mime === "image/jpeg" || block.mime === "image/jpg") image = await doc.embedJpg(block.bytes);
      } catch {
        image = null;
      }
      if (!image) {
        skippedImages++;
        continue;
      }
      const maxH = PAGE_H - MARGIN * 2;
      const scale = Math.min(CONTENT_W / image.width, maxH / image.height, 1);
      const w = image.width * scale;
      const h = image.height * scale;
      ensure(h);
      y -= h;
      page.drawImage(image, { x: MARGIN, y, width: w, height: h });
      y -= 8;
    } else {
      const cols = Math.max(...block.rows.map((r) => r.length));
      const colW = CONTENT_W / cols;
      const size = 9.5;
      const lh = size * 1.3;
      for (const row of block.rows) {
        const cellLines = row.map((cell) => layoutRuns(cell, size, colW - 8, fonts, clean));
        const maxLines = Math.min(Math.max(...cellLines.map((l) => l.length), 1), Math.floor((PAGE_H - MARGIN * 2 - 8) / lh));
        const rowH = maxLines * lh + 8;
        ensure(rowH);
        row.forEach((_, c) => {
          const x = MARGIN + c * colW;
          page.drawRectangle({ x, y: y - rowH, width: colW, height: rowH, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5 });
          cellLines[c]!.slice(0, maxLines).forEach((line, i) => {
            let tx = x + 4;
            for (const seg of line.segs) {
              page.drawText(seg.text, { x: tx, y: y - 4 - lh * (i + 1) + 3, size, font: seg.font, color: ink });
              tx += seg.font.widthOfTextAtSize(seg.text, size);
            }
          });
        });
        y -= rowH;
      }
      y -= 8;
    }
  }

  onProgress(0.97, traducir("Guardando el PDF"));
  const bytes = await doc.save();

  const warnings = [
    traducir("El PDF se genera dentro de Nexo a partir del contenido del documento: párrafos, títulos, negrita, cursiva, listas, tablas e imágenes. Columnas, cuadros de texto, encabezados, pies de página y las fuentes originales pueden cambiar."),
  ];
  if (skippedImages > 0) warnings.push(traducir("Se omitieron {skippedImages} imagen(es) en un formato que no se puede incrustar (solo PNG y JPEG).", { skippedImages }));
  if (replaced > 0) warnings.push(traducir("Algunos caracteres fuera del alfabeto latino (por ejemplo, emojis o escrituras no latinas) se sustituyeron por «?»."));
  if (messageCount > 0 && warnings.length === 1) warnings.push(traducir("Algunos estilos del documento no tienen equivalente y se aplicaron como texto normal."));

  return {
    blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
    name: safeFileName(`${baseName(file.name)}.pdf`),
    warnings,
  };
}
