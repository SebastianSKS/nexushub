import { PDFDocument, degrees } from "pdf-lib";
import { traducir } from "@/lib/i18n";
import { baseName, extensionOf, safeFileName } from "@/lib/documents/format";
import type { ImagesToPdfOptions, MarginOption } from "@/types/documents";
import { DocumentError } from "../errors";
import { abortarSiCancelado, bytesDe, cederHilo, MIME_PDF, pdfBlob, type Ctx, type Salida } from "./comun";

/** Tamaños en puntos PDF (1 pt = 1/72 in). */
const TAMANOS = { a4: [595.28, 841.89], letter: [612, 792] } as const;
const MARGENES: Record<MarginOption, number> = { none: 0, small: 24, large: 48 };

/**
 * Lee la orientación EXIF (1-8) de un JPEG. Las fotos de celular suelen guardarse «de lado» con una
 * etiqueta que indica cómo mostrarlas. Devuelve 1 (sin giro) si no hay EXIF o no se puede leer.
 */
export function leerOrientacionJpeg(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (view.getUint8(offset) !== 0xff) return 1;
    const marcador = view.getUint8(offset + 1);
    const largo = view.getUint16(offset + 2);
    if (marcador === 0xe1 && view.getUint32(offset + 4) === 0x45786966 /* "Exif" */) {
      const tiff = offset + 10;
      const little = view.getUint16(tiff) === 0x4949;
      const ifd = tiff + view.getUint32(tiff + 4, little);
      if (ifd + 2 > bytes.length) return 1;
      const entradas = view.getUint16(ifd, little);
      for (let i = 0; i < entradas; i++) {
        const entrada = ifd + 2 + i * 12;
        if (entrada + 12 > bytes.length) return 1;
        if (view.getUint16(entrada, little) === 0x0112) {
          const valor = view.getUint16(entrada + 8, little);
          return valor >= 1 && valor <= 8 ? valor : 1;
        }
      }
      return 1;
    }
    if (marcador === 0xda) return 1;
    offset += 2 + largo;
  }
  return 1;
}

export async function imagenesAPdf(files: File[], opts: ImagesToPdfOptions, ctx: Ctx): Promise<Salida[]> {
  const margen = MARGENES[opts.margin];
  const pdf = await PDFDocument.create();
  const n = files.length;

  for (let i = 0; i < n; i++) {
    abortarSiCancelado(ctx.signal);
    const file = files[i]!;
    ctx.report(i / n, traducir("Añadiendo {name} ({i} de {n})", { name: file.name, i: i + 1, n }));
    const bytes = await bytesDe(file);
    const esPng = extensionOf(file.name) === ".png";

    let imagen;
    try {
      imagen = esPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    } catch {
      throw new DocumentError(traducir("No se pudo leer la imagen «{name}».", { name: file.name }), traducir("Puede estar dañada o usar un formato JPEG/PNG poco común. Ábrela y guárdala de nuevo."), "IMAGE_INVALID");
    }

    // Orientación EXIF (solo JPEG): 3 = 180°, 6 = 90° horario, 8 = 90° antihorario.
    const exif = esPng ? 1 : leerOrientacionJpeg(bytes);
    const girada = exif === 6 || exif === 8;
    const anchoV = girada ? imagen.height : imagen.width;
    const altoV = girada ? imagen.width : imagen.height;

    let pagW: number;
    let pagH: number;
    if (opts.pageSize === "fit") {
      pagW = anchoV + margen * 2;
      pagH = altoV + margen * 2;
    } else {
      const [w, h] = TAMANOS[opts.pageSize];
      const horizontal = opts.orientation === "auto" ? anchoV > altoV : opts.orientation === "landscape";
      pagW = horizontal ? h : w;
      pagH = horizontal ? w : h;
    }

    const pagina = pdf.addPage([pagW, pagH]);
    const escala = Math.min((pagW - margen * 2) / anchoV, (pagH - margen * 2) / altoV);
    const w = anchoV * escala;
    const h = altoV * escala;
    const bx = (pagW - w) / 2;
    const by = (pagH - h) / 2;

    switch (exif) {
      case 3:
        pagina.drawImage(imagen, { x: bx + w, y: by + h, width: w, height: h, rotate: degrees(180) });
        break;
      case 6:
        pagina.drawImage(imagen, { x: bx, y: by + h, width: h, height: w, rotate: degrees(-90) });
        break;
      case 8:
        pagina.drawImage(imagen, { x: bx + w, y: by, width: h, height: w, rotate: degrees(90) });
        break;
      default:
        pagina.drawImage(imagen, { x: bx, y: by, width: w, height: h });
    }
    await cederHilo();
  }

  ctx.report(0.95, traducir("Guardando el PDF"));
  const nombre = n === 1 ? `${baseName(files[0]!.name)}.pdf` : "imagenes.pdf";
  return [{ name: safeFileName(nombre), blob: pdfBlob(await pdf.save()), mime: MIME_PDF }];
}
