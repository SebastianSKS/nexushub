import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { crearArchivoNuevo, nombreDeArchivoNuevo } from "../src/services/documents/nuevos.ts";

describe("archivos nuevos", () => {
  it("pone la extensión sin repetirla", () => {
    assert.equal(nombreDeArchivoNuevo("word", "Ensayo"), "Ensayo.docx");
    assert.equal(nombreDeArchivoNuevo("word", "Ensayo.docx"), "Ensayo.docx");
    assert.equal(nombreDeArchivoNuevo("excel", "  Balance  "), "Balance.xlsx");
    assert.equal(nombreDeArchivoNuevo("excel", ""), "Hoja de cálculo nueva.xlsx");
    assert.equal(nombreDeArchivoNuevo("texto", "notas.TXT"), "notas.txt");
  });

  it("un Word en blanco trae las partes que Word exige", async () => {
    const zip = await JSZip.loadAsync(await (await crearArchivoNuevo("word", "x")).arrayBuffer());
    for (const parte of ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml"]) assert.ok(zip.file(parte), parte);
  });

  it("un Excel y un PowerPoint en blanco también", async () => {
    const xlsx = await JSZip.loadAsync(await (await crearArchivoNuevo("excel", "x")).arrayBuffer());
    for (const parte of ["xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/styles.xml"]) assert.ok(xlsx.file(parte), parte);
    const pptx = await JSZip.loadAsync(await (await crearArchivoNuevo("powerpoint", "x")).arrayBuffer());
    for (const parte of ["ppt/presentation.xml", "ppt/slides/slide1.xml", "ppt/slideMasters/slideMaster1.xml", "ppt/theme/theme1.xml"]) assert.ok(pptx.file(parte), parte);
  });
});
