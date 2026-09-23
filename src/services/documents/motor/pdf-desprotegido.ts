import { PDFDocument } from "pdf-lib";
import { baseName, safeFileName } from "@/lib/documents/format";
import { DocumentError } from "../errors";
import { abrirPdfCifrado } from "../pdfjs";
import { abortarSiCancelado, cederHilo, MIME_PDF, pdfBlob, type Ctx, type Salida } from "./comun";

/**
 * Quita la contraseña de uno o varios PDF. Cómo: pdf.js abre el PDF cifrado con la contraseña que
 * diste (soporta cualquier variante del cifrado de PDF, no solo la que usa «Proteger con
 * contraseña»), y cada página se vuelve a dibujar como imagen en un PDF nuevo sin contraseña.
 *
 * Aviso importante: el resultado ya NO tiene texto seleccionable ni se puede editar como el
 * original — es un PDF hecho de imágenes, igual que «PDF a Word: fiel al diseño». No hay forma de
 * recuperar el PDF original tal cual sin la clave de cifrado, que no viaja dentro del archivo.
 */
export async function quitarContrasenaPdf(files: File[], contrasena: string, ctx: Ctx): Promise<Salida[]> {
  if (!contrasena.trim()) throw new DocumentError("Escribe la contraseña del PDF.");
  const salidas: Salida[] = [];
  const n = files.length;

  for (let i = 0; i < n; i++) {
    abortarSiCancelado(ctx.signal);
    const file = files[i]!;
    ctx.report(i / n, `Abriendo ${file.name} (${i + 1} de ${n})`);

    const resultado = await abrirPdfCifrado(file, contrasena);
    if (resultado.estado === "hace-falta") throw new DocumentError(`«${file.name}» no parece estar protegido con contraseña.`, "Solo hace falta esta herramienta con PDF que piden contraseña al abrirse.");
    if (resultado.estado === "incorrecta") throw new DocumentError(`La contraseña no abre «${file.name}».`, "Revisa mayúsculas y espacios, y vuelve a intentarlo.");

    const { doc: pdf, destroy } = resultado.doc;
    try {
      const total = pdf.numPages;
      const nuevo = await PDFDocument.create();

      for (let p = 1; p <= total; p++) {
        abortarSiCancelado(ctx.signal);
        ctx.report((i + p / total * 0.9) / n, `Página ${p} de ${total} · ${file.name}`);
        const page = await pdf.getPage(p);
        const vista0 = page.getViewport({ scale: 1 });
        const escala = Math.min(2.2, 2200 / Math.max(vista0.width, vista0.height));
        const vista = page.getViewport({ scale: escala });
        const lienzo = document.createElement("canvas");
        lienzo.width = Math.ceil(vista.width);
        lienzo.height = Math.ceil(vista.height);
        await page.render({ canvas: lienzo, viewport: vista, background: "#ffffff" }).promise;
        page.cleanup();

        const blob = await new Promise<Blob | null>((resolve) => lienzo.toBlob(resolve, "image/jpeg", 0.9));
        if (!blob) throw new DocumentError(`No se pudo dibujar la página ${p} de «${file.name}».`);
        const imagen = await nuevo.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        const pagina = nuevo.addPage([vista0.width, vista0.height]);
        pagina.drawImage(imagen, { x: 0, y: 0, width: vista0.width, height: vista0.height });
        await cederHilo();
      }

      ctx.warn("El resultado quedó como páginas-imagen, sin contraseña: ya no tiene texto seleccionable ni se puede editar como el PDF original.");
      salidas.push({ name: safeFileName(`${baseName(file.name)}_sin-contrasena.pdf`), blob: pdfBlob(await nuevo.save()), mime: MIME_PDF });
    } finally {
      await destroy();
    }
  }
  return salidas;
}
