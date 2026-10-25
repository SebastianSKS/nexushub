import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFStream, PDFString, type PDFContext, type PDFObject } from "pdf-lib";
import { traducir } from "@/lib/i18n";
import { baseName, safeFileName } from "@/lib/documents/format";
import { algoritmo2, comprobarContrasena, llaveDeObjeto } from "@/lib/documents/pdf-seguridad";
import { rc4 } from "@/lib/documents/rc4";
import { acotarOpciones, candidatos, contarCandidatos, MAX_INTENTOS, type OpcionesRecuperacion } from "@/lib/documents/recuperar-contrasena";
import { DocumentError } from "../errors";
import { abrirPdfCifrado } from "../pdfjs";
import { abortarSiCancelado, bytesDe, cederHilo, MIME_PDF, pdfBlob, type Ctx, type Salida } from "./comun";
import { quitarContrasenaPdf } from "./pdf-desprotegido";

/** Lo que hace falta para comprobar una contraseña con la vía rápida (cifrado RC4 estándar, revisión 3). */
interface DatosCifrado {
  O: Uint8Array;
  U: Uint8Array;
  P: number;
  id0: Uint8Array;
  largoLlave: number;
}

function bytesDeCadena(obj: unknown): Uint8Array | null {
  return obj instanceof PDFString || obj instanceof PDFHexString ? obj.asBytes() : null;
}

function numeroDe(dict: PDFDict, clave: string, porDefecto: number): number {
  const v = dict.lookup(PDFName.of(clave));
  return v instanceof PDFNumber ? v.asNumber() : porDefecto;
}

/**
 * Lee O, U, P e id0 del PDF, pero SOLO si usa el «cifrado estándar» RC4 revisión 3 (el mismo que pone
 * «Proteger con contraseña»). Para ese caso se puede comprobar cada contraseña con pura aritmética
 * (MD5 + RC4), que es miles de veces más rápido que volver a abrir el PDF con pdf.js en cada intento.
 * Si el PDF usa otro cifrado (AES, revisiones nuevas), devuelve null y el motor cae en la vía lenta.
 */
async function leerCifradoEstandar(bytes: Uint8Array): Promise<DatosCifrado | null> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    return null;
  }
  const c = doc.context;
  const enc = c.lookupMaybe(c.trailerInfo.Encrypt, PDFDict);
  if (!enc) return null;

  const filtro = enc.lookup(PDFName.of("Filter"));
  if (!(filtro instanceof PDFName) || !filtro.asString().includes("Standard")) return null;
  const V = numeroDe(enc, "V", 0);
  const R = numeroDe(enc, "R", 0);
  if (R !== 3 || V > 2) return null; // los algoritmos implementados son los de la revisión 3 (RC4)

  const O = bytesDeCadena(enc.lookup(PDFName.of("O")));
  const U = bytesDeCadena(enc.lookup(PDFName.of("U")));
  if (!O || !U) return null;
  const P = numeroDe(enc, "P", 0);
  const largoLlave = Math.max(5, Math.round(numeroDe(enc, "Length", 40) / 8));

  const idArr = c.lookupMaybe(c.trailerInfo.ID, PDFArray);
  const id0 = idArr && idArr.size() >= 1 ? bytesDeCadena(idArr.lookup(0)) : null;
  if (!id0) return null;

  return { O, U, P, id0, largoLlave };
}

function bytesAHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Deshace el cifrado RC4 de un objeto con la llave de SU objeto. RC4 es simétrico, así que es la misma
 * operación que cifrar (espejo de cifrarObjeto en pdf-protegido.ts): los strings y el contenido de los
 * streams guardados son el texto cifrado, y aplicarles RC4 con su llave devuelve el contenido original.
 */
function descifrarObjeto(obj: PDFObject, llaveObjeto: Uint8Array, context: PDFContext): PDFObject {
  if (obj instanceof PDFString || obj instanceof PDFHexString) {
    return PDFHexString.of(bytesAHex(rc4(llaveObjeto, obj.asBytes())));
  }
  if (obj instanceof PDFArray) {
    const nueva = PDFArray.withContext(context);
    for (const el of obj.asArray()) nueva.push(descifrarObjeto(el, llaveObjeto, context));
    return nueva;
  }
  if (obj instanceof PDFStream) {
    const dict = descifrarObjeto(obj.dict, llaveObjeto, context) as PDFDict;
    return PDFRawStream.of(dict, rc4(llaveObjeto, obj.getContents()));
  }
  if (obj instanceof PDFDict) {
    const mapa = new Map<PDFName, PDFObject>();
    for (const [k, v] of obj.entries()) mapa.set(k, descifrarObjeto(v, llaveObjeto, context));
    return PDFDict.fromMapWithContext(mapa, context);
  }
  return obj; // números, nombres, booleanos, null y referencias no van cifrados
}

/**
 * Entrega una copia SIN contraseña y CON el texto intacto, descifrando el PDF con la contraseña ya
 * hallada (solo cifrado estándar RC4). Devuelve null si no puede hacerlo con garantías —por ejemplo,
 * un PDF con flujos de objetos comprimidos que pdf-lib no descifra solo—: en ese caso el motor cae en
 * la copia-imagen, para no entregar nunca un archivo dañado.
 */
async function descifrarPdfEstandar(bytes: Uint8Array, contrasena: string, datos: DatosCifrado, paginasEsperadas: number): Promise<Uint8Array | null> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const c = doc.context;
    const llaveArchivo = algoritmo2(contrasena, datos.O, datos.P, datos.id0, datos.largoLlave);
    const encRef = c.trailerInfo.Encrypt instanceof PDFRef ? c.trailerInfo.Encrypt : null;

    for (const [ref, obj] of c.enumerateIndirectObjects()) {
      // El diccionario /Encrypt no va cifrado y se va a quitar: no se toca.
      if (encRef && ref.objectNumber === encRef.objectNumber && ref.generationNumber === encRef.generationNumber) continue;
      const llaveObjeto = llaveDeObjeto(llaveArchivo, ref.objectNumber, ref.generationNumber);
      const descifrado = descifrarObjeto(obj, llaveObjeto, c);
      if (descifrado !== obj) c.assign(ref, descifrado);
    }
    c.trailerInfo.Encrypt = undefined;

    const salida = await doc.save({ useObjectStreams: false });
    // Verificación: si el descifrado salió mal, volver a abrirlo (ya sin saltarse el cifrado) fallaría
    // o daría otro número de páginas. Solo se da por bueno si cuadra.
    const prueba = await PDFDocument.load(salida);
    if (prueba.getPageCount() < 1) return null;
    if (paginasEsperadas > 0 && prueba.getPageCount() !== paginasEsperadas) return null;
    return salida;
  } catch {
    return null;
  }
}

/**
 * Recupera la contraseña OLVIDADA de un PDF propio probando candidatos uno por uno (ver la nota de
 * alcance en lib/documents/recuperar-contrasena.ts): encuentra contraseñas débiles —números, fechas,
 * palabras comunes, combinaciones cortas— pero no una contraseña larga y al azar.
 *
 * Todo ocurre en el equipo, sin servidor. Al dar con ella, se avisa cuál es y se entrega además una
 * copia abrible del PDF (reutilizando «Quitar contraseña»).
 */
export async function recuperarContrasenaPdf(files: File[], opciones: OpcionesRecuperacion, ctx: Ctx): Promise<Salida[]> {
  const file = files[0];
  if (!file) throw new DocumentError(traducir("Añade al menos un archivo."));
  const opc = acotarOpciones(opciones);
  const bytes = await bytesDe(file);

  ctx.report(0, traducir("Revisando el PDF…"));
  // ¿De verdad pide contraseña para abrirse? Si abre sin ella, no hay nada que recuperar.
  const sinClave = await abrirPdfCifrado(file, "");
  if (sinClave.estado === "ok") {
    await sinClave.doc.destroy();
    throw new DocumentError(
      traducir("«{name}» no parece estar protegido con contraseña.", { name: file.name }),
      traducir("Solo hace falta esta herramienta con PDF que piden contraseña al abrirse."),
    );
  }

  const estandar = await leerCifradoEstandar(bytes);
  const total = Math.min(contarCandidatos(opc), MAX_INTENTOS);

  let encontrada: string | null = null;
  let intentos = 0;
  // En la vía rápida se ceden más intentos entre repintados; en la lenta cada intento ya espera a pdf.js.
  const cada = estandar ? 2000 : 25;

  for (const candidato of candidatos(opc)) {
    abortarSiCancelado(ctx.signal);
    if (intentos >= MAX_INTENTOS) break;
    intentos++;

    let acierta: boolean;
    if (estandar) {
      acierta = comprobarContrasena(candidato, estandar.O, estandar.U, estandar.P, estandar.id0, estandar.largoLlave).valida;
    } else {
      const r = await abrirPdfCifrado(file, candidato);
      acierta = r.estado === "ok";
      if (r.estado === "ok") await r.doc.destroy();
    }

    if (acierta) {
      encontrada = candidato;
      break;
    }

    if (intentos % cada === 0) {
      ctx.report(Math.min(0.9, intentos / total), traducir("Probando contraseñas… {intentos} de {total}", { intentos, total }));
      await cederHilo();
    }
  }

  if (encontrada === null) {
    throw new DocumentError(
      traducir("No se encontró la contraseña de «{name}».", { name: file.name }),
      traducir("Prueba con otro método o una longitud mayor. Una contraseña larga y al azar no se puede recuperar así."),
    );
  }

  ctx.warn(traducir("Contraseña encontrada: {contrasena}", { contrasena: encontrada }));
  ctx.report(0.9, traducir("Contraseña encontrada. Quitando la protección…"));

  // Primero, descifrado de verdad (texto intacto) si es el cifrado estándar. Para verificarlo, el número
  // de páginas que ve pdf.js al abrir con la contraseña sirve de referencia.
  if (estandar) {
    let paginas = 0;
    const abierto = await abrirPdfCifrado(file, encontrada);
    if (abierto.estado === "ok") {
      paginas = abierto.doc.doc.numPages;
      await abierto.doc.destroy();
    }
    const limpio = await descifrarPdfEstandar(bytes, encontrada, estandar, paginas);
    if (limpio) {
      return [{ name: safeFileName(`${baseName(file.name)}_sin-contrasena.pdf`), blob: pdfBlob(limpio), mime: MIME_PDF }];
    }
  }

  // Si no se pudo descifrar conservando el texto, copia abrible en imágenes (reutiliza «Quitar contraseña»).
  return quitarContrasenaPdf([file], encontrada, ctx);
}
