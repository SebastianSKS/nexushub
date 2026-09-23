import { PDFArray, PDFDict, PDFHexString, PDFRawStream, PDFStream, PDFString, type PDFContext, type PDFName, type PDFObject } from "pdf-lib";
import { baseName, safeFileName } from "@/lib/documents/format";
import { algoritmo2, algoritmo3, algoritmo5, LARGO_LLAVE, llaveDeObjeto, REVISION } from "@/lib/documents/pdf-seguridad";
import { rc4 } from "@/lib/documents/rc4";
import { DocumentError } from "../errors";
import { abortarSiCancelado, cargarPdf, cederHilo, MIME_PDF, pdfBlob, type Ctx, type Salida } from "./comun";

/** Todos los bits de permiso activados (32 bits con signo, bits reservados en 0 como pide la especificación). */
const PERMISOS_SIN_RESTRICCION = -4;

function bytesAHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function idAleatorio(): Uint8Array {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return b;
}

/** Cifra recursivamente los strings y el contenido de los streams de un objeto, con la llave de SU objeto. */
function cifrarObjeto(obj: PDFObject, llaveObjeto: Uint8Array, context: PDFContext): PDFObject {
  if (obj instanceof PDFString || obj instanceof PDFHexString) {
    return PDFHexString.of(bytesAHex(rc4(llaveObjeto, obj.asBytes())));
  }
  if (obj instanceof PDFArray) {
    const nueva = PDFArray.withContext(context);
    for (const el of obj.asArray()) nueva.push(cifrarObjeto(el, llaveObjeto, context));
    return nueva;
  }
  if (obj instanceof PDFStream) {
    const dictCifrado = cifrarObjeto(obj.dict, llaveObjeto, context) as PDFDict;
    return PDFRawStream.of(dictCifrado, rc4(llaveObjeto, obj.getContents()));
  }
  if (obj instanceof PDFDict) {
    const mapa = new Map<PDFName, PDFObject>();
    for (const [k, v] of obj.entries()) mapa.set(k, cifrarObjeto(v, llaveObjeto, context));
    return PDFDict.fromMapWithContext(mapa, context);
  }
  return obj; // números, nombres, booleanos, null y referencias no se cifran (la especificación no lo pide)
}

/**
 * Añade una contraseña a uno o varios PDF: "Cifrado estándar" de PDF, revisión 3 (RC4, llave de 128
 * bits) — lo abre cualquier lector de PDF con la contraseña, sin programas externos. Es una protección
 * básica (RC4 ya no se considera fuerte para datos muy sensibles), pero real: sin la contraseña correcta,
 * el archivo no se puede abrir.
 */
export async function protegerPdf(files: File[], contrasena: string, ctx: Ctx): Promise<Salida[]> {
  if (!contrasena.trim()) throw new DocumentError("Escribe una contraseña.");
  const salidas: Salida[] = [];
  const n = files.length;

  for (let i = 0; i < n; i++) {
    abortarSiCancelado(ctx.signal);
    const file = files[i]!;
    ctx.report(i / n, `Protegiendo ${file.name} (${i + 1} de ${n})`);
    const pdf = await cargarPdf(file);
    const context = pdf.context;

    const id0 = idAleatorio();
    const idHex = PDFHexString.of(bytesAHex(id0));
    context.trailerInfo.ID = context.obj([idHex, idHex]);

    // Misma contraseña para abrir y para permisos: más simple de explicar que "dos contraseñas distintas".
    const O = algoritmo3(contrasena, contrasena, LARGO_LLAVE);
    const llaveArchivo = algoritmo2(contrasena, O, PERMISOS_SIN_RESTRICCION, id0, LARGO_LLAVE);
    const U = algoritmo5(llaveArchivo, id0);

    for (const [ref, obj] of context.enumerateIndirectObjects()) {
      const llaveObjeto = llaveDeObjeto(llaveArchivo, ref.objectNumber, ref.generationNumber);
      const cifrado = cifrarObjeto(obj, llaveObjeto, context);
      if (cifrado !== obj) context.assign(ref, cifrado);
    }

    const encryptRef = context.register(
      context.obj({
        Filter: "Standard",
        V: 2,
        R: REVISION,
        Length: LARGO_LLAVE * 8,
        O: PDFHexString.of(bytesAHex(O)),
        U: PDFHexString.of(bytesAHex(U)),
        P: PERMISOS_SIN_RESTRICCION,
      }),
    );
    context.trailerInfo.Encrypt = encryptRef;

    ctx.report((i + 0.8) / n, `Guardando ${file.name}`);
    // Formato clásico (sin streams de objetos comprimidos): el cifrado estándar de PDF se diseñó para ese formato.
    const bytes = await pdf.save({ useObjectStreams: false });
    salidas.push({ name: safeFileName(`${baseName(file.name)}_protegido.pdf`), blob: pdfBlob(bytes), mime: MIME_PDF });
    await cederHilo();
  }
  return salidas;
}
