import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { textoDeCuando, textoDeDuracion } from "../src/lib/dia-texto.ts";
import { nombreDia } from "../src/lib/calendario/fechas.ts";
import { useIdiomaStore } from "../src/lib/i18n/index.ts";

describe("textoDeDuracion", () => {
  afterEach(() => useIdiomaStore.setState({ idioma: "es" }));

  it("minutos, horas y horas con minutos", () => {
    assert.equal(textoDeDuracion(45), "45 min");
    assert.equal(textoDeDuracion(60), "1 h");
    assert.equal(textoDeDuracion(80), "1 h 20 min");
    assert.equal(textoDeDuracion(0), "0 min");
  });
  it("en inglés queda igual de corto", () => {
    useIdiomaStore.setState({ idioma: "en" });
    assert.equal(textoDeDuracion(80), "1 h 20 min");
  });
});

describe("textoDeCuando", () => {
  afterEach(() => useIdiomaStore.setState({ idioma: "es" }));

  it("hoy, mañana y el día de la semana con mayúscula", () => {
    const jueves = new Date(2026, 9, 1);
    assert.equal(textoDeCuando(0, jueves, nombreDia), "Hoy");
    assert.equal(textoDeCuando(1, jueves, nombreDia), "Mañana");
    assert.equal(textoDeCuando(5, jueves, nombreDia), "Jueves");
  });
  it("en inglés", () => {
    useIdiomaStore.setState({ idioma: "en" });
    const jueves = new Date(2026, 9, 1);
    assert.equal(textoDeCuando(0, jueves, nombreDia), "Today");
    assert.equal(textoDeCuando(1, jueves, nombreDia), "Tomorrow");
    assert.equal(textoDeCuando(5, jueves, nombreDia), "Thursday");
  });
});
