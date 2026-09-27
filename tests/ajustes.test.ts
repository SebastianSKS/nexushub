import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACENTO_PREDETERMINADO, AJUSTES_PREDETERMINADOS, normalizarAjustes, SECCIONES_OCULTABLES, ZOOMS_INTERFAZ } from "../src/lib/ajustes-base.ts";

describe("normalizarAjustes", () => {
  it("con nada, o con cosas que no son un objeto, da los valores de fábrica", () => {
    for (const malo of [undefined, null, 5, "hola", [], true]) assert.deepEqual(normalizarAjustes(malo), AJUSTES_PREDETERMINADOS);
  });

  it("lo que ya es válido se conserva tal cual", () => {
    const buenos = { ...AJUSTES_PREDETERMINADOS, tema: "claro", acento: "#C42B1C", volumenPorDefecto: 35, idioma: "en", zoomInterfaz: 125, formatoHora: "12h", primerDiaSemana: "domingo", seccionesOcultas: ["video", "calculadora"], silencioActivo: true, silencioDesde: 23, silencioHasta: 6, sonidoAvisos: "nexo-gota", volumenAvisos: 40, reducirMovimiento: "si" };
    assert.deepEqual(normalizarAjustes(buenos), buenos);
  });

  it("un acento que no es #RRGGBB vuelve al de Windows", () => {
    for (const malo of ["rojo", "#fff", "#GGGGGG", "0078D4", 12, null]) assert.equal(normalizarAjustes({ acento: malo }).acento, ACENTO_PREDETERMINADO);
    assert.equal(normalizarAjustes({ acento: "#abcdef" }).acento, "#abcdef");
  });

  it("los volúmenes se recortan a 0–100 y se redondean", () => {
    assert.equal(normalizarAjustes({ volumenPorDefecto: 250 }).volumenPorDefecto, 100);
    assert.equal(normalizarAjustes({ volumenPorDefecto: -3 }).volumenPorDefecto, 0);
    assert.equal(normalizarAjustes({ volumenAvisos: 55.6 }).volumenAvisos, 56);
    assert.equal(normalizarAjustes({ volumenAvisos: "alto" }).volumenAvisos, AJUSTES_PREDETERMINADOS.volumenAvisos);
    assert.equal(normalizarAjustes({ volumenAvisos: Number.NaN }).volumenAvisos, AJUSTES_PREDETERMINADOS.volumenAvisos);
  });

  it("las opciones cerradas solo aceptan sus valores", () => {
    assert.equal(normalizarAjustes({ tema: "rosa" }).tema, "oscuro");
    assert.equal(normalizarAjustes({ efecto: "cristal" }).efecto, "mica");
    assert.equal(normalizarAjustes({ idioma: "fr" }).idioma, "sistema");
    assert.equal(normalizarAjustes({ seccionInicial: "otra" }).seccionInicial, "inicio");
    assert.equal(normalizarAjustes({ formatoHora: "8h" }).formatoHora, "24h");
    assert.equal(normalizarAjustes({ primerDiaSemana: "martes" }).primerDiaSemana, "lunes");
    assert.equal(normalizarAjustes({ reducirMovimiento: 1 }).reducirMovimiento, "sistema");
    assert.equal(normalizarAjustes({ sonidoAvisos: "trompeta" }).sonidoAvisos, AJUSTES_PREDETERMINADOS.sonidoAvisos);
  });

  it("los interruptores: lo que estaba activo por defecto solo se apaga con false, y lo apagado solo se enciende con true", () => {
    const a = normalizarAjustes({ usarOffice: 0, buscarEnPdfs: "no", segundoPlano: 1, silencioActivo: "si" });
    assert.equal(a.usarOffice, true);
    assert.equal(a.buscarEnPdfs, true);
    assert.equal(a.segundoPlano, false);
    assert.equal(a.silencioActivo, false);
    const b = normalizarAjustes({ usarOffice: false, buscarEnPdfs: false, segundoPlano: true, silencioActivo: true });
    assert.deepEqual([b.usarOffice, b.buscarEnPdfs, b.segundoPlano, b.silencioActivo], [false, false, true, true]);
  });

  it("el modo de bajo consumo es «auto» salvo que se elija «si» o «no»", () => {
    assert.equal(normalizarAjustes({}).modoAhorro, "auto");
    assert.equal(normalizarAjustes({ modoAhorro: "si" }).modoAhorro, "si");
    assert.equal(normalizarAjustes({ modoAhorro: "no" }).modoAhorro, "no");
    for (const mal of ["SI", 1, null, "otro"]) assert.equal(normalizarAjustes({ modoAhorro: mal }).modoAhorro, "auto");
  });

  it("los consejos están activos salvo que se apaguen a propósito", () => {
    assert.equal(normalizarAjustes({}).consejos, true);
    assert.equal(normalizarAjustes({ consejos: false }).consejos, false);
    assert.equal(normalizarAjustes({ consejos: 0 }).consejos, true);
  });

  it("solo se aceptan los avisos de clase y los zooms que ofrece la pantalla", () => {
    assert.equal(normalizarAjustes({ avisoClaseMin: 7 }).avisoClaseMin, 10);
    assert.equal(normalizarAjustes({ avisoClaseMin: 30 }).avisoClaseMin, 30);
    for (const z of ZOOMS_INTERFAZ) assert.equal(normalizarAjustes({ zoomInterfaz: z }).zoomInterfaz, z);
    assert.equal(normalizarAjustes({ zoomInterfaz: 300 }).zoomInterfaz, 100);
  });

  it("el aviso de eventos con hora solo acepta los márgenes que ofrece la pantalla", () => {
    assert.equal(normalizarAjustes({}).avisoEventoMin, 30);
    for (const m of [0, 10, 15, 30, 60, 120]) assert.equal(normalizarAjustes({ avisoEventoMin: m }).avisoEventoMin, m);
    for (const mal of [5, 45, -1, "30", null]) assert.equal(normalizarAjustes({ avisoEventoMin: mal }).avisoEventoMin, 30);
  });

  it("las horas de silencio y del resumen tienen que ser horas de verdad", () => {
    const a = normalizarAjustes({ silencioDesde: 25, silencioHasta: -1, resumenHora: 20 });
    assert.equal(a.silencioDesde, AJUSTES_PREDETERMINADOS.silencioDesde);
    assert.equal(a.silencioHasta, AJUSTES_PREDETERMINADOS.silencioHasta);
    assert.equal(a.resumenHora, 6);
  });

  it("las secciones escondidas: sin repetidas, sin inventadas y sin poder esconder Inicio ni Configuración", () => {
    const a = normalizarAjustes({ seccionesOcultas: ["video", "video", "inicio", "configuracion", "musica", 3, null] });
    assert.deepEqual(a.seccionesOcultas, ["video", "musica"]);
    assert.deepEqual(normalizarAjustes({ seccionesOcultas: "video" }).seccionesOcultas, []);
    for (const s of SECCIONES_OCULTABLES) assert.notEqual(s, "inicio");
  });

  it("no comparte listas con los valores de fábrica (no se contaminan entre sí)", () => {
    const a = normalizarAjustes({});
    a.seccionesOcultas.push("video");
    assert.deepEqual(AJUSTES_PREDETERMINADOS.seccionesOcultas, []);
  });
});
