import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PDFDocument } from "pdf-lib";
import type { Ctx } from "../src/services/documents/motor/comun.ts";
import { excelAPdf } from "../src/services/documents/motor/excel-a-pdf.ts";
import { powerpointAPdf } from "../src/services/documents/motor/powerpoint-a-pdf.ts";
import JSZip from "jszip";
import { crearArchivoNuevo } from "../src/services/documents/nuevos.ts";

const avisos: string[] = [];
const ctx = (): Ctx => ({ signal: new AbortController().signal, report: () => undefined, warn: (m) => void avisos.push(m) });
const paginas = async (blob: Blob) => (await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()))).getPageCount();

/** Un .xlsx mínimo pero real, con una celda «Hola» en A1 (texto en línea, sin sharedStrings). */
async function libroMinimo(): Promise<File> {
  const z = new JSZip();
  z.file("xl/workbook.xml", `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hoja1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  z.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
  z.file("xl/worksheets/sheet1.xml", `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Hola</t></is></c></row></sheetData></worksheet>`);
  return new File([(await z.generateAsync({ type: "uint8array" })) as BlobPart], "datos.xlsx");
}

describe("Office a PDF (motor propio)", () => {
  it("Excel: una hoja con datos se convierte en un PDF con páginas", async () => {
    const [s] = await excelAPdf(await libroMinimo(), ctx());
    assert.ok((await paginas(s!.blob)) >= 1);
    assert.match(s!.name, /\.pdf$/);
  });
  it("Excel: un libro sin ninguna celda con datos da un error claro", async () => {
    await assert.rejects(async () => excelAPdf(await crearArchivoNuevo("excel", "Datos"), ctx()), /no tiene celdas con datos/);
  });
  it("PowerPoint: una presentación nueva da al menos una página", async () => {
    const [s] = await powerpointAPdf(await crearArchivoNuevo("powerpoint", "Expo"), ctx());
    assert.ok((await paginas(s!.blob)) >= 1);
  });
  it("Excel y PowerPoint rechazan archivos que no son de Office con un mensaje claro", async () => {
    await assert.rejects(async () => excelAPdf(new File(["nada"], "roto.xlsx"), ctx()), /no se pudo leer como/);
    await assert.rejects(async () => powerpointAPdf(new File(["nada"], "roto.pptx"), ctx()), /no se pudo leer como/);
  });
});
