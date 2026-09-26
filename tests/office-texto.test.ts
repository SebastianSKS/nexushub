import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { agruparEnUnidades, decodificarXml, textoDeOffice, tipoDeArchivo } from "../src/lib/office-texto.ts";

async function zip(archivos: Record<string, string>): Promise<Uint8Array> {
  const z = new JSZip();
  for (const [ruta, contenido] of Object.entries(archivos)) z.file(ruta, contenido);
  return z.generateAsync({ type: "uint8array" });
}

describe("tipoDeArchivo", () => {
  it("reconoce PDF y Office nuevo sin importar las mayúsculas", () => {
    assert.equal(tipoDeArchivo("a.pdf"), "pdf");
    assert.equal(tipoDeArchivo("Tarea.DOCX"), "word");
    assert.equal(tipoDeArchivo("datos.xlsx"), "excel");
    assert.equal(tipoDeArchivo("expo.PPTX"), "powerpoint");
  });
  it("lo demás no", () => {
    assert.equal(tipoDeArchivo("viejo.doc"), null);
    assert.equal(tipoDeArchivo("sin_extension"), null);
  });
});

describe("decodificarXml", () => {
  it("entiende entidades con nombre y numéricas", () => {
    assert.equal(decodificarXml("Tom &amp; Jerry &lt;3 &#233; &#xE9; &quot;hola&quot;"), 'Tom & Jerry <3 é é "hola"');
  });
  it("deja lo que no entiende", () => {
    assert.equal(decodificarXml("&raro; &#99999999999;"), "&raro; &#99999999999;");
  });
});

describe("agruparEnUnidades", () => {
  it("junta párrafos hasta el tamaño y no parte un párrafo", () => {
    const u = agruparEnUnidades(["uno uno", "dos dos", "tres tres"], 16);
    assert.deepEqual(u, ["uno uno dos dos", "tres tres"]);
  });
  it("un párrafo más largo que el tamaño va solo, entero", () => {
    assert.deepEqual(agruparEnUnidades(["a", "b".repeat(50), "c"], 10), ["a", "b".repeat(50), "c"]);
  });
  it("sin párrafos no hay unidades", () => {
    assert.deepEqual(agruparEnUnidades([]), []);
  });
});

describe("textoDeOffice", () => {
  it("Word: saca los párrafos, con tabulaciones y saltos como espacio y acentos intactos", async () => {
    const bytes = await zip({
      "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>
        <w:p><w:pPr><w:pStyle w:val="Titulo"/></w:pPr><w:r><w:t>Informe de química</w:t></w:r></w:p>
        <w:p><w:r><w:t xml:space="preserve">Ácido</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>sulfúrico &amp; agua</w:t></w:r></w:p>
        <w:p/></w:body></w:document>`,
    });
    const r = await textoDeOffice(bytes, "word");
    assert.equal(r.tipo, "word");
    assert.deepEqual(r.unidades, ["Informe de química Ácido sulfúrico & agua"]);
  });

  it("Word: un documento sin cuerpo da cero unidades", async () => {
    assert.deepEqual((await textoDeOffice(await zip({ "otra/cosa.xml": "<a/>" }), "word")).unidades, []);
  });

  it("Excel: una unidad por hoja, con su nombre, textos compartidos, en línea y números", async () => {
    const bytes = await zip({
      "xl/workbook.xml": `<workbook xmlns:r="r"><sheets><sheet name="Notas &amp; pesos" sheetId="1" r:id="rId1"/><sheet name="Vacía" sheetId="2" r:id="rId2"/><sheet name="Otra" sheetId="3" r:id="rId3"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Type="t" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="t" Target="/xl/worksheets/sheet2.xml"/><Relationship Id="rId3" Type="t" Target="worksheets/sheet3.xml"/></Relationships>`,
      "xl/sharedStrings.xml": `<sst><si><t>Matemáticas</t></si><si><r><t>Cálculo </t></r><r><t>integral</t></r></si></sst>`,
      "xl/worksheets/sheet1.xml": `<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1"><v>9.5</v></c></row><row><c r="A2" t="s"><v>1</v></c><c r="B2" t="inlineStr"><is><t>en línea</t></is></c><c r="C2"/></row></sheetData></worksheet>`,
      "xl/worksheets/sheet2.xml": `<worksheet><sheetData/></worksheet>`,
      "xl/worksheets/sheet3.xml": `<worksheet><sheetData><row><c r="A1" t="str"><v>fórmula</v></c></row></sheetData></worksheet>`,
    });
    const r = await textoDeOffice(bytes, "excel");
    assert.deepEqual(r.unidades, ["Notas & pesos Matemáticas 9.5 Cálculo integral en línea", "Vacía", "Otra fórmula"]);
  });

  it("PowerPoint: una unidad por diapositiva, en orden numérico, conservando las vacías", async () => {
    const dia = (t: string) => `<p:sld xmlns:a="a"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
    const bytes = await zip({
      "ppt/slides/slide10.xml": dia("Décima"),
      "ppt/slides/slide2.xml": `<p:sld><p:cSld><p:spTree/></p:cSld></p:sld>`,
      "ppt/slides/slide1.xml": dia("Portada &amp; título"),
      "ppt/slides/_rels/slide1.xml.rels": "<r/>",
    });
    const r = await textoDeOffice(bytes, "powerpoint");
    assert.deepEqual(r.unidades, ["Portada & título", "", "Décima"]);
  });

  it("un archivo que no es un ZIP lanza (para que el índice lo marque como sin texto)", async () => {
    await assert.rejects(() => textoDeOffice(new TextEncoder().encode("esto no es un zip"), "word"));
  });
});
