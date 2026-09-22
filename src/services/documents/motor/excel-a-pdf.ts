import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { baseName, safeFileName } from "@/lib/documents/format";
import { DocumentError } from "../errors";
import { abortarSiCancelado, cederHilo, MIME_PDF, pdfBlob, type Ctx, type Salida } from "./comun";
import { abrirOoxml, crearLimpiador, leerXml, lista, recortar, relaciones, texto } from "./ooxml";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Celda {
  texto: string;
  numero: boolean;
  negrita: boolean;
  alin: "left" | "center" | "right" | null;
}
interface Hoja {
  nombre: string;
  filas: Map<number, Map<number, Celda>>;
  anchos: Map<number, number>;
  altos: Map<number, number>;
  colsOcultas: Set<number>;
  filasOcultas: Set<number>;
  maxFila: number;
  maxCol: number;
  horizontal: boolean;
}
interface Estilo {
  numFmtId: number;
  negrita: boolean;
  alin: Celda["alin"];
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MAX_FILAS = 20_000;
const MAX_COLS = 200;
const MAX_PAGINAS = 400;

const FORMATOS_INTEGRADOS: Record<number, string> = {
  1: "0",
  2: "0.00",
  3: "#,##0",
  4: "#,##0.00",
  9: "0%",
  10: "0.00%",
  14: "dd/mm/yyyy",
  15: "d-mmm-yy",
  16: "d-mmm",
  17: "mmm-yy",
  18: "h:mm AM/PM",
  19: "h:mm:ss AM/PM",
  20: "hh:mm",
  21: "hh:mm:ss",
  22: "dd/mm/yyyy hh:mm",
  37: "#,##0",
  38: "#,##0",
  39: "#,##0.00",
  40: "#,##0.00",
  45: "mm:ss",
  46: "[h]:mm:ss",
  47: "mm:ss.0",
};

const sinComillas = (code: string) => code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "");
const esFormatoFecha = (code: string) => /[ymdhs]/i.test(sinComillas(code)) && !/^general$/i.test(code);

function colDeRef(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

const dos = (n: number) => String(n).padStart(2, "0");

function formatearFecha(serial: number, code: string): string {
  const ms = Math.round((serial - 25569) * 86_400_000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(serial);
  const limpio = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "");
  const ampm = /AM\/PM/i.test(limpio);
  let ultimoFueHora = false;
  return limpio
    .replace(/AM\/PM|yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|\.0+/gi, (tok, pos: number, todo: string) => {
      const t = tok.toLowerCase();
      if (t === "yyyy") return String(d.getUTCFullYear());
      if (t === "yy") return dos(d.getUTCFullYear() % 100);
      if (t === "mmmm") return ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][d.getUTCMonth()]!;
      if (t === "mmm") return MESES[d.getUTCMonth()]!;
      if (t === "mm" || t === "m") {
        const siguienteSeg = /^[^a-z]*s/i.test(todo.slice(pos + tok.length));
        if (ultimoFueHora || siguienteSeg) {
          ultimoFueHora = false;
          return t === "mm" ? dos(d.getUTCMinutes()) : String(d.getUTCMinutes());
        }
        return t === "mm" ? dos(d.getUTCMonth() + 1) : String(d.getUTCMonth() + 1);
      }
      if (t === "dddd") return ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d.getUTCDay()]!;
      if (t === "ddd") return ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getUTCDay()]!;
      if (t === "dd") return dos(d.getUTCDate());
      if (t === "d") return String(d.getUTCDate());
      if (t === "hh" || t === "h") {
        ultimoFueHora = true;
        const h = ampm ? d.getUTCHours() % 12 || 12 : d.getUTCHours();
        return t === "hh" ? dos(h) : String(h);
      }
      if (t === "ss") return dos(d.getUTCSeconds());
      if (t === "s") return String(d.getUTCSeconds());
      if (t === "am/pm") return d.getUTCHours() < 12 ? "AM" : "PM";
      return "";
    })
    .trim();
}

function formatearNumero(valor: number, code: string): string {
  const limpio = sinComillas(code);
  const porcentaje = limpio.includes("%");
  const dec = /0\.(0+)/.exec(limpio)?.[1]?.length ?? (/#\.(#+)/.test(limpio) ? 0 : 0);
  const miles = /#,##|,#|0,0/.test(limpio);
  const v = porcentaje ? valor * 100 : valor;
  let s = v.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: miles });
  const moneda = /\[\$([^\]-]*)[^\]]*\]|"([$€£¥][^"]*)"|([$€£¥])/.exec(code);
  const simbolo = (moneda?.[1] ?? moneda?.[2] ?? moneda?.[3] ?? "").trim();
  if (simbolo) s = code.indexOf(simbolo) > code.search(/[0#]/) ? `${s} ${simbolo}` : `${simbolo}${s}`;
  return porcentaje ? `${s}%` : s;
}

function formatearValor(crudo: string, xf: Estilo | undefined, codigos: Map<number, string>): { texto: string; numero: boolean } {
  const n = Number(crudo);
  if (crudo === "" || Number.isNaN(n)) return { texto: crudo, numero: false };
  const id = xf?.numFmtId ?? 0;
  const code = codigos.get(id) ?? FORMATOS_INTEGRADOS[id];
  if (!code || /^general$/i.test(code) || id === 49) return { texto: String(Number(n.toPrecision(12))), numero: true };
  if (esFormatoFecha(code)) return { texto: formatearFecha(n, code), numero: false };
  return { texto: formatearNumero(n, code), numero: true };
}

async function leerLibro(file: File) {
  const zip = await abrirOoxml(file, "hoja de cálculo de Excel");
  const libro = await leerXml(zip, "xl/workbook.xml");
  if (!libro?.workbook) throw new DocumentError(`«${file.name}» no parece un archivo de Excel (.xlsx).`, "Comprueba que sea un .xlsx y no un .xls antiguo.");
  const rels = await relaciones(zip, "xl/workbook.xml");

  // Cadenas compartidas
  const cadenas: string[] = [];
  const sst = await leerXml(zip, "xl/sharedStrings.xml");
  for (const si of lista<any>(sst?.sst?.si)) {
    cadenas.push(si?.t !== undefined ? texto(si.t) : lista<any>(si?.r).map((r) => texto(r.t)).join(""));
  }

  // Estilos: formatos numéricos, fuentes en negrita y celdas
  const codigos = new Map<number, string>();
  const estilos: Estilo[] = [];
  const st = (await leerXml(zip, "xl/styles.xml"))?.styleSheet;
  for (const nf of lista<any>(st?.numFmts?.numFmt)) codigos.set(Number(nf["@_numFmtId"]), String(nf["@_formatCode"]));
  const negritas = lista<any>(st?.fonts?.font).map((f) => f?.b !== undefined && f.b?.["@_val"] !== "0" && f.b?.["@_val"] !== "false");
  for (const xf of lista<any>(st?.cellXfs?.xf)) {
    const h = xf?.alignment?.["@_horizontal"];
    estilos.push({
      numFmtId: Number(xf["@_numFmtId"] ?? 0),
      negrita: negritas[Number(xf["@_fontId"] ?? 0)] ?? false,
      alin: h === "center" || h === "right" ? h : h === "left" ? "left" : null,
    });
  }

  const hojas: Hoja[] = [];
  let recortadas = false;
  for (const s of lista<any>(libro.workbook.sheets?.sheet)) {
    if (s["@_state"] === "hidden" || s["@_state"] === "veryHidden") continue;
    const rel = rels[s["@_id"]];
    if (!rel) continue;
    const ws = (await leerXml(zip, rel.ruta))?.worksheet;
    if (!ws) continue;

    const hoja: Hoja = {
      nombre: String(s["@_name"] ?? "Hoja"),
      filas: new Map(),
      anchos: new Map(),
      altos: new Map(),
      colsOcultas: new Set(),
      filasOcultas: new Set(),
      maxFila: 0,
      maxCol: -1,
      horizontal: ws.pageSetup?.["@_orientation"] === "landscape",
    };
    for (const c of lista<any>(ws.cols?.col)) {
      const min = Number(c["@_min"]) - 1;
      const max = Math.min(Number(c["@_max"]) - 1, MAX_COLS);
      for (let i = min; i <= max; i++) {
        if (c["@_hidden"] === "1" || c["@_hidden"] === "true") hoja.colsOcultas.add(i);
        if (c["@_width"]) hoja.anchos.set(i, Number(c["@_width"]) * 5.25 + 3);
      }
    }
    for (const fila of lista<any>(ws.sheetData?.row)) {
      const r = Number(fila["@_r"]);
      if (!r) continue;
      if (r > MAX_FILAS) {
        recortadas = true;
        break;
      }
      if (fila["@_hidden"] === "1" || fila["@_hidden"] === "true") hoja.filasOcultas.add(r);
      if (fila["@_ht"]) hoja.altos.set(r, Number(fila["@_ht"]));
      const celdas = new Map<number, Celda>();
      for (const c of lista<any>(fila.c)) {
        const col = colDeRef(String(c["@_r"] ?? ""));
        if (col < 0 || col >= MAX_COLS) continue;
        const tipo = c["@_t"];
        let crudo = "";
        if (tipo === "s") crudo = cadenas[Number(texto(c.v))] ?? "";
        else if (tipo === "inlineStr") crudo = c.is?.t !== undefined ? texto(c.is.t) : lista<any>(c.is?.r).map((x) => texto(x.t)).join("");
        else if (tipo === "b") crudo = texto(c.v) === "1" ? "VERDADERO" : "FALSO";
        else crudo = texto(c.v);
        if (crudo === "") continue;
        const xf = estilos[Number(c["@_s"] ?? 0)];
        const numerico = tipo === undefined || tipo === "n";
        const val = numerico ? formatearValor(crudo, xf, codigos) : { texto: crudo, numero: false };
        celdas.set(col, { texto: val.texto, numero: val.numero, negrita: xf?.negrita ?? false, alin: xf?.alin ?? null });
        hoja.maxCol = Math.max(hoja.maxCol, col);
        hoja.maxFila = Math.max(hoja.maxFila, r);
      }
      if (celdas.size) hoja.filas.set(r, celdas);
    }
    if (hoja.filas.size > 0) hojas.push(hoja);
  }
  return { hojas, recortadas };
}

const PAG = { vertical: [595.28, 841.89], horizontal: [841.89, 595.28] } as const;
const MARGEN = 36;
const ENCABEZADO = 22;
const ANCHO_PREDET = 48;
const ALTO_PREDET = 15;

export async function excelAPdf(file: File, ctx: Ctx): Promise<Salida[]> {
  ctx.report(0.03, `Leyendo ${file.name}`);
  const { hojas, recortadas } = await leerLibro(file);
  if (hojas.length === 0) throw new DocumentError(`«${file.name}» no tiene celdas con datos.`, "Comprueba que las hojas no estén vacías u ocultas.");

  const doc = await PDFDocument.create();
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const limpiador = crearLimpiador(normal);
  const limpiar = (t: string) => limpiador.limpiar(t);
  const gris = rgb(0.75, 0.75, 0.75);
  const tinta = rgb(0.1, 0.1, 0.1);
  let paginas = 0;
  let cortado = false;
  let recortadoAncho = false;

  for (let h = 0; h < hojas.length; h++) {
    const hoja = hojas[h]!;
    abortarSiCancelado(ctx.signal);
    ctx.report(0.1 + (h / hojas.length) * 0.85, `Maquetando la hoja «${hoja.nombre}» (${h + 1} de ${hojas.length})`);
    await cederHilo();

    const cols: number[] = [];
    for (let c = 0; c <= hoja.maxCol; c++) if (!hoja.colsOcultas.has(c)) cols.push(c);
    // Columnas sin ancho propio: se ajustan a su contenido (como el «autoajustar» de Excel), para que fechas y cifras no se corten.
    const auto = (c: number): number => {
      let mayor = 0;
      for (const fila of hoja.filas.values()) {
        const celda = fila.get(c);
        if (!celda) continue;
        const w = (celda.negrita ? negrita : normal).widthOfTextAtSize(limpiar(celda.texto), 10) + 8;
        mayor = Math.max(mayor, celda.numero || /^[\d/:.\- ]+$/.test(celda.texto) ? w : Math.min(w, 140));
      }
      return Math.min(Math.max(mayor, ANCHO_PREDET), 240);
    };
    const anchoAuto = new Map<number, number>();
    const ancho = (c: number) => hoja.anchos.get(c) ?? (anchoAuto.get(c) ?? anchoAuto.set(c, auto(c)).get(c)!);
    const total = cols.reduce((s, c) => s + ancho(c), 0);
    const horizontal = hoja.horizontal || total > PAG.vertical[0] - MARGEN * 2;
    const [pw, ph] = horizontal ? PAG.horizontal : PAG.vertical;
    const disponible = pw - MARGEN * 2;

    // Si la hoja es un poco más ancha que la página, se reduce para que quepa; si es mucho más, se reparte en varias páginas.
    let escala = 1;
    if (total > disponible && disponible / total >= 0.6) escala = disponible / total;
    const tam = Math.max(6, 10 * escala);

    const grupos: number[][] = [];
    let actual: number[] = [];
    let acumulado = 0;
    for (const c of cols) {
      const w = ancho(c) * escala;
      if (actual.length > 0 && acumulado + w > disponible) {
        grupos.push(actual);
        actual = [];
        acumulado = 0;
      }
      actual.push(c);
      acumulado += w;
    }
    if (actual.length) grupos.push(actual);

    const filas: number[] = [];
    for (let r = 1; r <= hoja.maxFila; r++) if (!hoja.filasOcultas.has(r)) filas.push(r);
    const alto = (r: number) => (hoja.altos.get(r) ?? ALTO_PREDET) * Math.max(escala, 0.7);
    const utilAlto = ph - MARGEN * 2 - ENCABEZADO;
    const bloques: number[][] = [];
    let bloque: number[] = [];
    let hAcum = 0;
    for (const r of filas) {
      if (bloque.length > 0 && hAcum + alto(r) > utilAlto) {
        bloques.push(bloque);
        bloque = [];
        hAcum = 0;
      }
      bloque.push(r);
      hAcum += alto(r);
    }
    if (bloque.length) bloques.push(bloque);

    for (let g = 0; g < grupos.length; g++) {
      for (let b = 0; b < bloques.length; b++) {
        if (paginas >= MAX_PAGINAS) {
          cortado = true;
          break;
        }
        paginas++;
        const pagina = doc.addPage([pw, ph]);
        const partes = [grupos.length > 1 ? `columnas ${g + 1}/${grupos.length}` : "", bloques.length > 1 ? `página ${b + 1}/${bloques.length}` : ""].filter(Boolean).join(" · ");
        pagina.drawText(limpiar(`${hoja.nombre}${partes ? `  ·  ${partes}` : ""}`), { x: MARGEN, y: ph - MARGEN + 4, size: 8, font: normal, color: rgb(0.45, 0.45, 0.45) });

        let y = ph - MARGEN - ENCABEZADO + 10;
        for (const r of bloques[b]!) {
          const hFila = alto(r);
          y -= hFila;
          const celdas = hoja.filas.get(r);
          let x = MARGEN;
          for (let i = 0; i < grupos[g]!.length; i++) {
            const c = grupos[g]![i]!;
            const w = ancho(c) * escala;
            pagina.drawRectangle({ x, y, width: w, height: hFila, borderColor: gris, borderWidth: 0.4 });
            const celda = celdas?.get(c);
            if (celda && celda.texto) {
              const fuente = celda.negrita ? negrita : normal;
              let s = limpiar(celda.texto);
              const alin = celda.alin ?? (celda.numero ? "right" : "left");
              // El texto de la izquierda puede invadir las celdas vacías de su derecha, como en Excel.
              let disp = w - 4;
              if (alin === "left" && !celda.numero) {
                for (let k = i + 1; k < grupos[g]!.length && !celdas?.has(grupos[g]![k]!); k++) disp += ancho(grupos[g]![k]!) * escala;
              }
              if (fuente.widthOfTextAtSize(s, tam) > disp) recortadoAncho = true;
              s = recortar(fuente, s, tam, disp);
              const sw = fuente.widthOfTextAtSize(s, tam);
              const tx = alin === "right" ? x + w - 2 - sw : alin === "center" ? x + (w - sw) / 2 : x + 2;
              pagina.drawText(s, { x: tx, y: y + (hFila - tam) / 2 + 1.5, size: tam, font: fuente, color: tinta });
            }
            x += w;
          }
        }
      }
    }
  }

  ctx.report(0.97, "Guardando el PDF");
  const bytes = await doc.save();
  if (recortadas) ctx.warn(`Solo se convirtieron las primeras ${MAX_FILAS.toLocaleString("es")} filas de cada hoja.`);
  if (cortado) ctx.warn(`El PDF se limitó a ${MAX_PAGINAS} páginas. Convierte por partes si necesitas el resto.`);
  if (recortadoAncho) ctx.warn("Algunos textos son más largos que su celda y se cortaron con «…». El PDF no ajusta el alto de las filas al texto.");
  if (limpiador.sustituidos > 0) ctx.warn("Algunos caracteres fuera del alfabeto latino se sustituyeron por «?».");
  ctx.warn("Se convierten los valores y formatos básicos de cada hoja (números, porcentajes, fechas, negrita, alineación). Gráficos, imágenes, colores de relleno, combinaciones de celdas y formato condicional no se incluyen.");
  return [{ name: safeFileName(`${baseName(file.name)}.pdf`), blob: pdfBlob(bytes), mime: MIME_PDF }];
}
