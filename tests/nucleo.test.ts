import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { interpolar, leerPreferencia, localeDe, resolverIdioma, T, traducirDe } from "../src/lib/i18n/nucleo.ts";

const en = { Guardar: "Save", "Hola, {nombre}": "Hello, {nombre}" };

describe("idiomas: núcleo", () => {
  it("con «sistema» elige inglés solo si el sistema está en inglés", () => {
    assert.equal(resolverIdioma("sistema", "en-US"), "en");
    assert.equal(resolverIdioma("sistema", "EN-gb"), "en");
    assert.equal(resolverIdioma("sistema", "es-MX"), "es");
    assert.equal(resolverIdioma("sistema", "fr-FR"), "es");
    assert.equal(resolverIdioma("sistema", null), "es");
  });

  it("una preferencia elegida manda sobre el sistema", () => {
    assert.equal(resolverIdioma("es", "en-US"), "es");
    assert.equal(resolverIdioma("en", "es-MX"), "en");
  });

  it("lee la preferencia guardada y tolera datos dañados", () => {
    assert.equal(leerPreferencia('{"idioma":"en"}'), "en");
    assert.equal(leerPreferencia('{"idioma":"es"}'), "es");
    assert.equal(leerPreferencia('{"idioma":"fr"}'), "sistema");
    assert.equal(leerPreferencia("no es json"), "sistema");
    assert.equal(leerPreferencia(null), "sistema");
  });

  it("traduce al inglés y deja el español tal cual", () => {
    assert.equal(traducirDe(en, "en", "Guardar"), "Save");
    assert.equal(traducirDe(en, "es", "Guardar"), "Guardar");
  });

  it("si falta la traducción, muestra el español (nunca una clave rota)", () => {
    assert.equal(traducirDe(en, "en", "Cancelar"), "Cancelar");
  });

  it("sustituye variables y deja las que no tienen valor", () => {
    assert.equal(traducirDe(en, "en", "Hola, {nombre}", { nombre: "Ana" }), "Hello, Ana");
    assert.equal(traducirDe(en, "es", "Hola, {nombre}", { nombre: "Ana" }), "Hola, Ana");
    assert.equal(interpolar("{a} y {b}", { a: 1 }), "1 y {b}");
    assert.equal(interpolar("sin variables"), "sin variables");
  });

  it("T no cambia el texto", () => {
    assert.equal(T("Bienvenido"), "Bienvenido");
  });

  it("da el código de idioma para fechas y números", () => {
    assert.equal(localeDe("es"), "es-MX");
    assert.equal(localeDe("en"), "en-US");
  });
});
