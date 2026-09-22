import { PDFArray, PDFBool, PDFDict, PDFName, PDFRawStream } from "pdf-lib";
import { baseName, safeFileName } from "@/lib/documents/format";
import type { CompressLevel, CompressOptions } from "@/types/documents";
import { abortarSiCancelado, cargarPdf, cederHilo, MIME_PDF, nombresUnicos, pdfBlob, type Ctx, type Salida } from "./comun";

/** Por nivel: lado máximo de las imágenes (px) y calidad JPEG. */
const NIVELES: Record<CompressLevel, { lado: number; calidad: number }> = {
  light: { lado: 3000, calidad: 0.85 },
  recommended: { lado: 1600, calidad: 0.7 },
  extreme: { lado: 1000, calidad: 0.5 },
};

function esJpeg(dict: PDFDict): boolean {
  const f = dict.get(PDFName.of("Filter"));
  if (f instanceof PDFName) return f.asString() === "/DCTDecode";
  if (f instanceof PDFArray && f.size() === 1) return f.get(0)?.toString() === "/DCTDecode";
  return false;
}

async function recomprimirJpeg(bytes: Uint8Array, lado: number, calidad: number): Promise<{ bytes: Uint8Array; w: number; h: number } | null> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type: "image/jpeg" }));
  } catch {
    return null;
  }
  const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * escala));
  const h = Math.max(1, Math.round(bmp.height * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext("2d");
  if (!ctx) {
    bmp.close();
    return null;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, "image/jpeg", calidad));
  if (!blob) return null;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h };
}

/**
 * Comprime un PDF SIN programas externos: recomprime las imágenes JPEG incrustadas (que son casi todo el
 * peso de un PDF de fotos o escaneos) reduciendo su resolución y calidad según el nivel, y optimiza la
 * estructura. El texto y los vectores no se tocan (siguen siendo texto seleccionable).
 */
export async function comprimirPdf(files: File[], opts: CompressOptions, ctx: Ctx): Promise<Salida[]> {
  const { lado, calidad } = NIVELES[opts.level];
  const unico = nombresUnicos();
  const salidas: Salida[] = [];
  const n = files.length;

  for (let i = 0; i < n; i++) {
    abortarSiCancelado(ctx.signal);
    const file = files[i]!;
    const etiqueta = n > 1 ? `${file.name} (${i + 1} de ${n})` : file.name;
    const rep = (f: number, m: string) => ctx.report((i + Math.min(Math.max(f, 0), 1)) / n, m);
    rep(0.02, `Leyendo ${etiqueta}`);

    const pdf = await cargarPdf(file);
    const imagenes = pdf.context
      .enumerateIndirectObjects()
      .filter(([, o]) => o instanceof PDFRawStream && o.dict.get(PDFName.of("Subtype")) === PDFName.of("Image") && esJpeg(o.dict))
      .map(([ref, o]) => ({ ref, stream: o as PDFRawStream }));

    let recomprimidas = 0;
    for (let k = 0; k < imagenes.length; k++) {
      abortarSiCancelado(ctx.signal);
      rep(0.05 + (k / Math.max(imagenes.length, 1)) * 0.85, `Recomprimiendo imágenes de ${etiqueta} (${k + 1} de ${imagenes.length})`);
      const { ref, stream } = imagenes[k]!;
      const dict = stream.dict;
      const mascara = dict.get(PDFName.of("ImageMask"));
      if (mascara instanceof PDFBool && mascara.asBoolean()) continue;
      const nuevo = await recomprimirJpeg(stream.getContents(), lado, calidad);
      if (!nuevo || nuevo.bytes.length >= stream.getContents().length * 0.95) continue; // solo si de verdad pesa menos

      const d = pdf.context.obj({
        Type: "XObject",
        Subtype: "Image",
        Width: nuevo.w,
        Height: nuevo.h,
        ColorSpace: "DeviceRGB",
        BitsPerComponent: 8,
        Filter: "DCTDecode",
        Length: nuevo.bytes.length,
      });
      const suave = dict.get(PDFName.of("SMask"));
      if (suave) d.set(PDFName.of("SMask"), suave);
      const original = dict.get(PDFName.of("Mask"));
      if (original) d.set(PDFName.of("Mask"), original);
      pdf.context.assign(ref, PDFRawStream.of(d, nuevo.bytes));
      recomprimidas++;
      if (k % 4 === 3) await cederHilo();
    }

    rep(0.93, `Guardando ${etiqueta}`);
    const guardado = await pdf.save({ useObjectStreams: true });
    const nombre = unico(safeFileName(`${baseName(file.name)}_comprimido.pdf`));

    // Si el resultado no es más ligero, se conserva el original: nunca se entrega un archivo peor.
    if (guardado.length >= file.size) {
      ctx.warn(
        imagenes.length === 0
          ? `«${file.name}» no tiene imágenes JPEG que reducir (es solo texto o gráficos): ya estaba tan ligero como se puede sin perder calidad, así que se conserva tal cual.`
          : `«${file.name}» ya estaba optimizado: no se pudo reducir más, así que se conserva tal cual.`,
      );
      salidas.push({ name: nombre, blob: file, mime: MIME_PDF, originalSize: file.size });
    } else {
      if (recomprimidas === 0) {
        ctx.warn(
          imagenes.length > 0
            ? `Las imágenes de «${file.name}» ya estaban optimizadas para este nivel; solo se optimizó la estructura. Prueba con un nivel más fuerte.`
            : `«${file.name}» no tenía imágenes JPEG que recomprimir; solo se optimizó su estructura.`,
        );
      }
      salidas.push({ name: nombre, blob: pdfBlob(guardado), mime: MIME_PDF, originalSize: file.size });
    }
  }
  return salidas;
}

