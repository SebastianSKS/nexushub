import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { KIND_EXTENSIONS, kindFromFilename } from "../src/lib/documents/kinds.ts";
import { pagesToRangeText, parseRanges, rangesToPages } from "../src/lib/documents/ranges.ts";
import { getTool, isToolId, TOOLS } from "../src/lib/documents/tools.ts";
import { traducir, useIdiomaStore } from "../src/lib/i18n/index.ts";
import { SLUGS, SLUGS_HERRAMIENTA, toolIdDeSlug } from "../src/lib/rutas.ts";

describe("parseRanges", () => {
  it("un rango, páginas sueltas y mezclas", () => {
    assert.deepEqual(parseRanges("1-3, 5, 7-9", 10).ranges, [[1, 3], [5, 5], [7, 9]]);
    assert.deepEqual(parseRanges("4", 10).ranges, [[4, 4]]);
  });
  it("acepta punto y coma, espacios de más y rangos al revés", () => {
    assert.deepEqual(parseRanges(" 2 ; 5 - 3 ,, 8 ", 10).ranges, [[2, 2], [3, 5], [8, 8]]);
  });
  it("las páginas primera y última cuentan; una más allá, no", () => {
    assert.equal(parseRanges("1-10", 10).error, undefined);
    assert.match(parseRanges("1-11", 10).error ?? "", /queda fuera del documento, que tiene 10 páginas/);
    assert.match(parseRanges("0", 10).error ?? "", /fuera del documento/);
    assert.match(parseRanges("2", 1).error ?? "", /tiene 1 página\./);
  });
  it("lo vacío o lo que no son números da un mensaje de ayuda", () => {
    assert.match(parseRanges("", 10).error ?? "", /Indica al menos una página/);
    assert.match(parseRanges(" , ; ", 10).error ?? "", /Indica al menos una página/);
    assert.match(parseRanges("a-b", 10).error ?? "", /no es un rango válido/);
    assert.match(parseRanges("1-2-3", 10).error ?? "", /no es un rango válido/);
    assert.match(parseRanges("-5", 10).error ?? "", /no es un rango válido/);
  });
  it("cuando hay error no devuelve rangos a medias", () => {
    assert.deepEqual(parseRanges("1, 99", 10).ranges, []);
  });
});

describe("rangesToPages y pagesToRangeText", () => {
  it("expanden sin repetidas y en orden", () => {
    assert.deepEqual(rangesToPages([[3, 5], [1, 2], [4, 6]]), [1, 2, 3, 4, 5, 6]);
  });
  it("juntan páginas seguidas en rangos", () => {
    assert.equal(pagesToRangeText([1, 2, 3, 5, 7, 8]), "1-3, 5, 7-8");
    assert.equal(pagesToRangeText([9, 1, 1, 2]), "1-2, 9");
    assert.equal(pagesToRangeText([]), "");
  });
  it("son inversas entre sí", () => {
    const paginas = [1, 2, 3, 6, 9, 10, 12];
    const { ranges } = parseRanges(pagesToRangeText(paginas), 20);
    assert.deepEqual(rangesToPages(ranges), paginas);
  });
});

describe("tipos de archivo", () => {
  it("por extensión, sin importar mayúsculas", () => {
    assert.equal(kindFromFilename("Informe.DOCX"), "word");
    assert.equal(kindFromFilename("datos.xlsx"), "excel");
    assert.equal(kindFromFilename("expo.pptx"), "powerpoint");
    assert.equal(kindFromFilename("libro.pdf"), "pdf");
    assert.equal(kindFromFilename("foto.jpeg"), "image");
    assert.equal(kindFromFilename("foto.PNG"), "image");
  });
  it("lo que no se reconoce es null", () => {
    for (const n of ["nota.txt", "video.mp4", "sin_extension", "archivo.xls"]) assert.equal(kindFromFilename(n), null, n);
  });
  it("la lista de extensiones y la clasificación dicen lo mismo", () => {
    for (const [tipo, exts] of Object.entries(KIND_EXTENSIONS)) for (const e of exts) assert.equal(kindFromFilename(`a${e}`), tipo);
  });
});

describe("catálogo de herramientas", () => {
  afterEach(() => useIdiomaStore.setState({ idioma: "es" }));

  it("cada herramienta está completa y sus límites tienen sentido", () => {
    for (const t of TOOLS) {
      assert.ok(t.name && t.description && t.action, t.id);
      assert.ok(t.accepts.length > 0, `${t.id} no acepta nada`);
      assert.ok(t.minFiles >= 1 && t.maxFiles >= t.minFiles, `${t.id}: límites de archivos`);
    }
  });
  it("los identificadores no se repiten y todos tienen su dirección", () => {
    const ids = TOOLS.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.ok(SLUGS_HERRAMIENTA[id], `${id} sin slug`);
    assert.equal(new Set(SLUGS).size, SLUGS.length, "slugs repetidos");
    assert.equal(Object.keys(SLUGS_HERRAMIENTA).length, ids.length, "sobra o falta alguna dirección");
  });
  it("de la dirección a la herramienta y de vuelta", () => {
    for (const t of TOOLS) assert.equal(toolIdDeSlug(SLUGS_HERRAMIENTA[t.id]), t.id);
    assert.equal(toolIdDeSlug("no-existe"), null);
  });
  it("getTool e isToolId", () => {
    assert.equal(getTool("merge").id, "merge");
    assert.throws(() => getTool("inventada" as never));
    assert.ok(isToolId("split") && !isToolId("nada") && !isToolId(3));
  });
  it("los nombres de las herramientas se traducen al inglés", () => {
    useIdiomaStore.setState({ idioma: "en" });
    assert.equal(getTool("merge").name, "Unir PDF", "el catálogo guarda la clave en español");
    assert.equal(traducir(getTool("merge").name), "Merge PDF");
    assert.equal(traducir(getTool("ocr").description).includes("scanned"), true);
  });
});
