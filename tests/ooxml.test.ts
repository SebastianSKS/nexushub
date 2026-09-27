import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { abrirOoxml, leerXml, lista, relaciones, resolverRuta, texto } from "../src/services/documents/motor/ooxml.ts";

describe("lista", () => {
  it("siempre devuelve una lista", () => {
    assert.deepEqual(lista(undefined), []);
    assert.deepEqual(lista(null), []);
    assert.deepEqual(lista(""), []);
    assert.deepEqual(lista("a"), ["a"]);
    assert.deepEqual(lista(["a", "b"]), ["a", "b"]);
    assert.deepEqual(lista(0), [0]);
  });
});

describe("texto", () => {
  it("saca el texto de una cadena o de un nodo con #text", () => {
    assert.equal(texto("hola"), "hola");
    assert.equal(texto({ "#text": " con espacio ", "@_xml:space": "preserve" }), " con espacio ");
    assert.equal(texto({ "#text": 42 }), "42");
  });
  it("lo demás es texto vacío", () => {
    for (const x of [undefined, null, {}, [], 5]) assert.equal(texto(x), "");
  });
});

describe("resolverRuta", () => {
  it("sube carpetas con «..» y salta los «.»", () => {
    assert.equal(resolverRuta("ppt/slides", "../media/a.png"), "ppt/media/a.png");
    assert.equal(resolverRuta("xl/worksheets", "./sheet2.xml"), "xl/worksheets/sheet2.xml");
    assert.equal(resolverRuta("", "word/document.xml"), "word/document.xml");
  });
  it("una ruta que empieza con «/» es absoluta dentro del ZIP", () => {
    assert.equal(resolverRuta("ppt/slides", "/ppt/slideLayouts/l1.xml"), "ppt/slideLayouts/l1.xml");
  });
  it("subir más carpetas de las que hay no rompe", () => {
    assert.equal(resolverRuta("a", "../../../x.xml"), "x.xml");
  });
});

describe("abrirOoxml, leerXml y relaciones", () => {
  async function zip(archivos: Record<string, string>): Promise<File> {
    const z = new JSZip();
    for (const [ruta, contenido] of Object.entries(archivos)) z.file(ruta, contenido);
    return new File([(await z.generateAsync({ type: "uint8array" })) as BlobPart], "x.pptx");
  }
  const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://ejemplo.com" TargetMode="External"/>
  </Relationships>`;

  it("abre un ZIP y lee un XML (sin prefijos de espacio de nombres); lo que no existe da null", async () => {
    const z = await abrirOoxml(await zip({ "a/b.xml": `<p:raiz xmlns:p="urn:x"><p:hijo id="1">hola</p:hijo></p:raiz>` }), "presentación");
    const xml = await leerXml(z, "/a/b.xml");
    assert.equal(xml.raiz.hijo["#text"], "hola");
    assert.equal(xml.raiz.hijo["@_id"], "1");
    assert.equal(await leerXml(z, "no/existe.xml"), null);
  });
  it("un archivo que no es un ZIP da un error entendible", async () => {
    await assert.rejects(() => abrirOoxml(new File(["no soy un zip"], "roto.docx"), "documento de Word"), /no se pudo leer como documento de Word/);
  });
  it("las relaciones de una parte se resuelven a rutas dentro del ZIP y las externas se ignoran", async () => {
    const z = await abrirOoxml(await zip({ "ppt/slides/_rels/slide1.xml.rels": rels }), "presentación");
    const r = await relaciones(z, "ppt/slides/slide1.xml");
    assert.deepEqual(r, { rId1: { ruta: "ppt/slideLayouts/slideLayout1.xml", tipo: "slideLayout" }, rId2: { ruta: "ppt/media/image1.png", tipo: "image" } });
  });
  it("una parte sin relaciones da un objeto vacío", async () => {
    const z = await abrirOoxml(await zip({ "a.xml": "<a/>" }), "presentación");
    assert.deepEqual(await relaciones(z, "a.xml"), {});
  });
});
