import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { claveFecha, cuando, cumpleEn, diasEnMes, diasHastaIso, diferenciaDias, esBisiesto, eventoOcurreEn, fechaDesdeIso, fechaEnAnio, fechaLarga, nombreMes, proximaOcurrenciaEvento, proximoCumple, saludo } from "../src/lib/calendario/fechas.ts";
import { useIdiomaStore } from "../src/lib/i18n/index.ts";

const iso = claveFecha;
const d = (y: number, m: number, dia: number, h = 0) => new Date(y, m - 1, dia, h);

describe("años y meses", () => {
  it("bisiestos: cada 4, no cada 100, sí cada 400", () => {
    assert.deepEqual([2024, 2028, 2000].map(esBisiesto), [true, true, true]);
    assert.deepEqual([2026, 1900, 2100].map(esBisiesto), [false, false, false]);
  });
  it("días de cada mes", () => {
    assert.deepEqual(Array.from({ length: 12 }, (_, i) => diasEnMes(2026, i + 1)), [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
    assert.equal(diasEnMes(2028, 2), 29);
  });
});

describe("diferenciaDias y fechas en texto", () => {
  it("cuenta días completos ignorando la hora", () => {
    assert.equal(diferenciaDias(d(2026, 9, 26, 23), d(2026, 9, 27, 1)), 1);
    assert.equal(diferenciaDias(d(2026, 9, 27), d(2026, 9, 26)), -1);
    assert.equal(diferenciaDias(d(2026, 9, 26), d(2026, 9, 26, 15)), 0);
  });
  it("no se confunde con los cambios de horario (marzo y noviembre)", () => {
    assert.equal(diferenciaDias(d(2026, 3, 7), d(2026, 3, 9)), 2);
    assert.equal(diferenciaDias(d(2026, 10, 30), d(2026, 11, 2)), 3);
  });
  it("«AAAA-MM-DD» a fecha local y de vuelta", () => {
    assert.equal(iso(fechaDesdeIso("2026-02-05")), "2026-02-05");
    assert.equal(fechaDesdeIso("2026-02-05").getHours(), 0);
  });
  it("días hasta una fecha (0 hoy, negativo si ya pasó)", () => {
    const hoy = d(2026, 9, 26, 18);
    assert.equal(diasHastaIso("2026-09-26", hoy), 0);
    assert.equal(diasHastaIso("2026-10-01", hoy), 5);
    assert.equal(diasHastaIso("2026-09-20", hoy), -6);
  });
});

describe("cumpleaños", () => {
  it("el 29 de febrero se celebra el 28 en años que no son bisiestos", () => {
    const c = { dia: 29, mes: 2, anio: 2004 };
    assert.equal(iso(fechaEnAnio(c, 2028)), "2028-02-29");
    assert.equal(iso(fechaEnAnio(c, 2027)), "2027-02-28");
  });
  it("el próximo cumpleaños: hoy cuenta como 0 días", () => {
    const p = proximoCumple({ dia: 26, mes: 9, anio: 2006 }, d(2026, 9, 26, 20));
    assert.equal(p.dias, 0);
    assert.equal(p.edad, 20);
  });
  it("si ya pasó este año, es el del año que viene", () => {
    const p = proximoCumple({ dia: 1, mes: 9, anio: null }, d(2026, 9, 26));
    assert.equal(iso(p.fecha), "2027-09-01");
    assert.equal(p.dias, 340);
    assert.equal(p.edad, null);
  });
  it("cumpleEn dice si cae justo ese día", () => {
    assert.equal(cumpleEn({ dia: 5, mes: 3, anio: null }, d(2026, 3, 5)), true);
    assert.equal(cumpleEn({ dia: 5, mes: 3, anio: null }, d(2026, 3, 6)), false);
    assert.equal(cumpleEn({ dia: 29, mes: 2, anio: null }, d(2027, 2, 28)), true);
  });
});

describe("eventoOcurreEn", () => {
  it("una sola vez: solo su día, nunca antes ni después", () => {
    assert.equal(eventoOcurreEn("2026-09-26", "no", d(2026, 9, 26)), true);
    assert.equal(eventoOcurreEn("2026-09-26", "no", d(2026, 9, 27)), false);
    assert.equal(eventoOcurreEn("2026-09-26", "no", d(2026, 9, 25)), false);
  });
  it("cada semana: mismo día de la semana, desde el inicio", () => {
    assert.equal(eventoOcurreEn("2026-09-26", "semanal", d(2026, 10, 3)), true);
    assert.equal(eventoOcurreEn("2026-09-26", "semanal", d(2026, 10, 4)), false);
    assert.equal(eventoOcurreEn("2026-09-26", "semanal", d(2026, 9, 19)), false, "antes de empezar");
  });
  it("cada mes: mismo día, y el último del mes si el mes es más corto", () => {
    assert.equal(eventoOcurreEn("2026-01-31", "mensual", d(2026, 2, 28)), true);
    assert.equal(eventoOcurreEn("2026-01-31", "mensual", d(2026, 3, 31)), true);
    assert.equal(eventoOcurreEn("2026-01-31", "mensual", d(2026, 3, 30)), false);
    assert.equal(eventoOcurreEn("2026-01-15", "mensual", d(2026, 4, 15)), true);
  });
});

describe("proximaOcurrenciaEvento", () => {
  const hoy = d(2026, 9, 26);
  it("una vez: futura o de hoy sí; pasada, no", () => {
    assert.equal(proximaOcurrenciaEvento("2026-09-26", "no", hoy)?.dias, 0);
    assert.equal(proximaOcurrenciaEvento("2026-10-03", "no", hoy)?.dias, 7);
    assert.equal(proximaOcurrenciaEvento("2026-09-25", "no", hoy), null);
  });
  it("semanal: la siguiente que toca", () => {
    const p = proximaOcurrenciaEvento("2026-09-01", "semanal", hoy)!;
    assert.equal(iso(p.fecha), "2026-09-29");
    assert.equal(p.dias, 3);
  });
  it("mensual: la siguiente que toca, respetando meses cortos", () => {
    assert.equal(iso(proximaOcurrenciaEvento("2026-01-31", "mensual", hoy)!.fecha), "2026-09-30");
    assert.equal(iso(proximaOcurrenciaEvento("2026-09-10", "mensual", hoy)!.fecha), "2026-10-10");
  });
  it("si todavía no empieza, es su primer día", () => {
    assert.equal(iso(proximaOcurrenciaEvento("2026-11-11", "mensual", hoy)!.fecha), "2026-11-11");
  });
});

describe("textos que dependen del idioma", () => {
  afterEach(() => useIdiomaStore.setState({ idioma: "es" }));

  it("en español", () => {
    useIdiomaStore.setState({ idioma: "es" });
    assert.equal(fechaLarga(d(2026, 9, 26)), "sábado 26 de septiembre");
    assert.equal(nombreMes(0), "enero");
    assert.deepEqual([0, 1, 2].map(cuando), ["Hoy", "Mañana", "En 2 días"]);
    assert.deepEqual([3, 8, 15, 21].map(saludo), ["Buenas noches", "Buenos días", "Buenas tardes", "Buenas noches"]);
  });

  it("en inglés cambian los nombres y los saludos", () => {
    useIdiomaStore.setState({ idioma: "en" });
    assert.equal(nombreMes(0), "January");
    assert.equal(cuando(0), "Today");
    assert.equal(cuando(1), "Tomorrow");
    assert.equal(saludo(8), "Good morning");
    assert.match(fechaLarga(d(2026, 9, 26)), /Saturday/);
  });
});
