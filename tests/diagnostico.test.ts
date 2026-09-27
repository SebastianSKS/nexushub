import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armarDiagnostico, direccionDeReporte, recortar, sinRutasDeUsuario } from "../src/lib/diagnostico.ts";

const base = { version: "0.2.0", entorno: "escritorio" as const, idioma: "es", fecha: new Date("2026-09-26T12:00:00Z") };

describe("armarDiagnostico", () => {
  it("incluye lo técnico y la fecha, sin datos personales", () => {
    const t = armarDiagnostico({ ...base, ruta: "/horario", agente: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/129" });
    assert.match(t, /Versión: 0\.2\.0/);
    assert.match(t, /Entorno: escritorio/);
    assert.match(t, /Idioma: es/);
    assert.match(t, /Pantalla: \/horario/);
    assert.match(t, /Fecha: 2026-09-26T12:00:00\.000Z/);
    assert.doesNotMatch(t, /Error:/);
  });

  it("incluye lo que se sabe del equipo, si se da", () => {
    assert.match(armarDiagnostico({ ...base, equipo: "4 núcleos, 8 GB, bajo consumo: sí" }), /Equipo: 4 núcleos, 8 GB, bajo consumo: sí/);
    assert.doesNotMatch(armarDiagnostico(base), /Equipo:/);
  });

  it("con error: nombre, mensaje, código y pila", () => {
    const t = armarDiagnostico({ ...base, error: { nombre: "TypeError", mensaje: "x is undefined", digest: "abc123", pila: "at foo (bundle.js:1:2)" } });
    assert.match(t, /Error: TypeError: x is undefined/);
    assert.match(t, /Código: abc123/);
    assert.match(t, /at foo/);
  });

  it("quita el nombre de usuario de las rutas de Windows", () => {
    const t = armarDiagnostico({ ...base, error: { mensaje: "No se pudo leer C:\\Users\\Sebastian\\Documents\\Nexo\\a.pdf", pila: "at C:/Users/Ana/app/x.js:3" } });
    assert.doesNotMatch(t, /Sebastian|Ana\b/);
    assert.match(t, /<usuario>/);
  });

  it("una pila enorme se recorta", () => {
    const t = armarDiagnostico({ ...base, error: { pila: "x".repeat(5000) } });
    assert.ok(t.length < 2000);
    assert.match(t, /recortado/);
  });

  it("sin versión ni mensaje, no escribe «undefined»", () => {
    const t = armarDiagnostico({ ...base, version: "", error: {} });
    assert.doesNotMatch(t, /undefined/);
    assert.match(t, /desconocida/);
    assert.match(t, /\(sin mensaje\)/);
  });
});

describe("sinRutasDeUsuario y recortar", () => {
  it("reconoce rutas con barras normales, invertidas y en español", () => {
    assert.equal(sinRutasDeUsuario("C:\\Users\\Ana\\x"), "<usuario>\\x");
    assert.equal(sinRutasDeUsuario("d:/users/luis/y"), "<usuario>/y");
    assert.equal(sinRutasDeUsuario("C:\\Usuarios\\María\\z"), "<usuario>\\z");
    assert.equal(sinRutasDeUsuario("nada que quitar"), "nada que quitar");
  });
  it("recortar solo corta lo largo", () => {
    assert.equal(recortar("corto", 10), "corto");
    assert.equal(recortar("0123456789", 10), "0123456789");
    assert.equal(recortar("0123456789A", 10), "0123456789… (recortado)");
  });
});

describe("direccionDeReporte", () => {
  it("abre un reporte nuevo en el repositorio con el diagnóstico dentro", () => {
    const url = new URL(direccionDeReporte("SebastianSKS/nexushub", "Versión: 1"));
    assert.equal(url.origin + url.pathname, "https://github.com/SebastianSKS/nexushub/issues/new");
    assert.equal(url.searchParams.get("title"), "Problema en Nexo");
    assert.match(url.searchParams.get("body") ?? "", /Versión: 1/);
  });
  it("el cuerpo no se pasa de largo (las direcciones muy largas fallan)", () => {
    const url = direccionDeReporte("a/b", "x".repeat(10_000));
    assert.ok(url.length < 4000, `${url.length}`);
  });
});
