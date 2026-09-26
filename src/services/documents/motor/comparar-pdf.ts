import { diffLines, type Change } from "diff";
import { traducir, useIdiomaStore } from "@/lib/i18n";
import { baseName, safeFileName } from "@/lib/documents/format";
import { openPdf } from "../pdfjs";
import { abortarSiCancelado, cederHilo, type Ctx, type Salida } from "./comun";

/** Todo el texto de un PDF, página por página, con un separador antes de cada una. */
async function extraerTexto(file: File, ctx: Ctx, desde: number, hasta: number): Promise<string> {
  const { doc, destroy } = await openPdf(file);
  try {
    const total = doc.numPages;
    const paginas: string[] = [];
    for (let n = 1; n <= total; n++) {
      abortarSiCancelado(ctx.signal);
      ctx.report(desde + ((n - 1) / total) * (hasta - desde), traducir("Leyendo {name}: página {n} de {total}", { name: file.name, n, total }));
      const page = await doc.getPage(n);
      const contenido = await page.getTextContent();
      let texto = "";
      for (const item of contenido.items) {
        if (!("str" in item)) continue;
        texto += item.str;
        if (item.hasEOL) texto += "\n";
      }
      page.cleanup();
      paginas.push(`——— ${traducir("Página {n}", { n })} ———\n${texto.trim()}`);
      await cederHilo();
    }
    return paginas.join("\n\n");
  } finally {
    await destroy();
  }
}

function escaparHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Arma un reporte HTML autocontenido con las diferencias resaltadas (verde = añadido, rojo = quitado). */
function reporteHtml(nombreA: string, nombreB: string, partes: Change[]): string {
  const iguales = partes.every((p) => !p.added && !p.removed);
  const cuerpo = partes
    .map((p) => {
      const clase = p.added ? "agregado" : p.removed ? "quitado" : "igual";
      const marca = p.added ? "+ " : p.removed ? "− " : "";
      return p.value
        .split("\n")
        .filter((l, i, arr) => !(l === "" && i === arr.length - 1)) // quita la línea vacía final de cada tramo
        .map((linea) => `<div class="l ${clase}">${marca}${escaparHtml(linea) || "&nbsp;"}</div>`)
        .join("");
    })
    .join("");

  return `<!doctype html>
<html lang="${useIdiomaStore.getState().idioma}"><head><meta charset="utf-8"><title>${escaparHtml(traducir("Comparación"))}: ${escaparHtml(nombreA)} vs ${escaparHtml(nombreB)}</title>
<style>
  body { margin: 0; padding: 24px; background: #1b1b1b; color: #e6e6e6; font: 14px/1.6 "Segoe UI", system-ui, sans-serif; }
  h1 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
  p.sub { color: #a0a0a0; margin: 0 0 20px; font-size: 13px; }
  .reporte { background: #232323; border: 1px solid #3a3a3a; border-radius: 8px; padding: 12px 0; max-width: 900px; }
  .l { padding: 1px 16px; white-space: pre-wrap; word-break: break-word; font-family: "Cascadia Code", Consolas, monospace; font-size: 13px; }
  .l.agregado { background: rgba(50, 168, 82, 0.18); color: #7ee2a0; }
  .l.quitado { background: rgba(196, 43, 28, 0.18); color: #f29a90; text-decoration: line-through; text-decoration-color: rgba(242,154,144,0.5); }
  .l.igual { color: #b8b8b8; }
  .aviso { margin-top: 16px; padding: 10px 14px; background: #2b2b1a; border: 1px solid #4d4626; border-radius: 6px; color: #d9c98a; font-size: 13px; max-width: 900px; }
</style></head>
<body>
  <h1>${escaparHtml(traducir("Comparación de texto"))}</h1>
  <p class="sub"><strong>A:</strong> ${escaparHtml(nombreA)} &nbsp;·&nbsp; <strong>B:</strong> ${escaparHtml(nombreB)}</p>
  ${iguales ? `<p class="sub">${escaparHtml(traducir("No se encontraron diferencias de texto entre los dos archivos."))}</p>` : ""}
  <div class="reporte">${cuerpo}</div>
  <p class="aviso">${escaparHtml(traducir("Compara solo el texto, en el orden en que aparece en cada página — no compara imágenes, diseño ni formato. Ábrelo con tu navegador."))}</p>
</body></html>`;
}

/** Compara el texto de dos PDF y produce un reporte HTML con lo añadido/quitado resaltado. */
export async function compararPdf(archivoA: File, archivoB: File, ctx: Ctx): Promise<Salida[]> {
  const textoA = await extraerTexto(archivoA, ctx, 0, 0.45);
  const textoB = await extraerTexto(archivoB, ctx, 0.45, 0.9);
  abortarSiCancelado(ctx.signal);
  ctx.report(0.95, traducir("Comparando el texto"));
  const partes = diffLines(textoA, textoB);
  const html = reporteHtml(archivoA.name, archivoB.name, partes);
  const nombre = safeFileName(`comparacion_${baseName(archivoA.name)}_vs_${baseName(archivoB.name)}.html`);
  return [{ name: nombre, blob: new Blob([html], { type: "text/html" }), mime: "text/html" }];
}
