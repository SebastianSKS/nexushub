import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { diasHasta, idsDeRonda, lasQueCostaron, MAX_SESIONES_POR_MAZO, normalizarSesiones, pendientesDe, programar, proximoRepaso, useRepasoStore, type Tarjeta } from "../src/store/repaso-store.ts";

const DIA = 24 * 60 * 60 * 1000;
const AHORA = Date.UTC(2026, 10, 5, 12, 0, 0);

const nueva = (p: Partial<Tarjeta> = {}): Tarjeta => ({
  id: "t1",
  mazoId: "m1",
  frente: "CPU",
  reverso: "Unidad central de proceso",
  facilidad: 2.5,
  intervalo: 0,
  repeticiones: 0,
  vence: 0,
  creada: AHORA,
  ...p,
});

describe("repaso: la repetición espaciada", () => {
  it("«bien» la deja para mañana la primera vez, en 3 días la segunda y luego va creciendo", () => {
    const a = programar(nueva(), "bien", AHORA);
    assert.equal(a.intervalo, 1);
    assert.equal(a.vence, AHORA + DIA);
    const b = programar(a, "bien", AHORA);
    assert.equal(b.intervalo, 3);
    const c = programar(b, "bien", AHORA);
    assert.equal(c.intervalo, Math.round(3 * 2.5));
    assert.equal(c.repeticiones, 3);
  });

  it("«fácil» espacia más que «bien» y sube la facilidad", () => {
    const facil = programar(nueva(), "facil", AHORA);
    assert.equal(facil.intervalo, 2);
    assert.ok(facil.facilidad > 2.5);
    const bien = programar(nueva({ repeticiones: 2, intervalo: 3 }), "bien", AHORA);
    const masFacil = programar(nueva({ repeticiones: 2, intervalo: 3 }), "facil", AHORA);
    assert.ok(masFacil.intervalo > bien.intervalo);
  });

  it("«otra vez» la reinicia y vuelve a tocar de inmediato", () => {
    const olvidada = programar(nueva({ repeticiones: 4, intervalo: 20, vence: AHORA + 20 * DIA }), "otra", AHORA);
    assert.equal(olvidada.repeticiones, 0);
    assert.equal(olvidada.intervalo, 0);
    assert.equal(olvidada.vence, AHORA);
    assert.ok(olvidada.facilidad < 2.5);
  });

  it("la facilidad nunca baja de 1.3, por muchas veces que se falle", () => {
    let t = nueva();
    for (let i = 0; i < 50; i++) t = programar(t, "otra", AHORA);
    assert.equal(t.facilidad, 1.3);
  });

  it("pendientesDe devuelve las nuevas y las vencidas de ese mazo, no las que aún no tocan", () => {
    const tarjetas = [
      nueva({ id: "nueva", vence: 0 }),
      nueva({ id: "vencida", vence: AHORA - DIA }),
      nueva({ id: "futura", vence: AHORA + DIA }),
      nueva({ id: "otro-mazo", mazoId: "m2", vence: 0 }),
    ];
    assert.deepEqual(pendientesDe(tarjetas, "m1", AHORA).map((t) => t.id), ["nueva", "vencida"]);
  });
});

describe("repaso: pegar apuntes", () => {
  beforeEach(() => useRepasoStore.setState({ mazos: [], tarjetas: [], cargado: true }));

  const importar = (texto: string) => {
    const id = useRepasoStore.getState().crearMazo("Prueba");
    const n = useRepasoStore.getState().importarTexto(id, texto);
    return { n, tarjetas: useRepasoStore.getState().tarjetas };
  };

  it("crea una tarjeta por línea con «término - definición», con -, :, = o tabulador", () => {
    const { n, tarjetas } = importar("CPU - unidad central\nALU: operaciones\nRegistros = memoria rápida\nBus\tcamino de datos");
    assert.equal(n, 4);
    assert.deepEqual(tarjetas.map((t) => [t.frente, t.reverso]), [
      ["CPU", "unidad central"],
      ["ALU", "operaciones"],
      ["Registros", "memoria rápida"],
      ["Bus", "camino de datos"],
    ]);
  });

  it("parte solo en el primer separador y conserva el resto de la definición", () => {
    const { tarjetas } = importar("Ciclo - buscar - decodificar - ejecutar");
    assert.equal(tarjetas[0]!.frente, "Ciclo");
    assert.equal(tarjetas[0]!.reverso, "buscar - decodificar - ejecutar");
  });

  it("no parte las palabras con guion (bien-estar) ni crea tarjetas de líneas vacías o sin separador", () => {
    const { n, tarjetas } = importar("\nbien-estar\n   \nsolo una palabra\nTérmino - definición");
    assert.equal(n, 1);
    assert.equal(tarjetas[0]!.frente, "Término");
  });

  it("las tarjetas nuevas tocan de inmediato", () => {
    const { tarjetas } = importar("A - b");
    assert.equal(pendientesDe(tarjetas, tarjetas[0]!.mazoId).length, 1);
  });
});

describe("repaso: historial y práctica", () => {
  beforeEach(() => useRepasoStore.setState({ mazos: [], tarjetas: [], sesiones: [], cargado: true }));
  const anotar = (sesion: string, tarjeta: string, cal: "otra" | "bien" | "facil", practica = false, mazo = "m1") => useRepasoStore.getState().anotar(sesion, mazo, practica, tarjeta, cal, AHORA);

  it("un repaso guarda una entrada por tarjeta, con la primera calificación", () => {
    anotar("s1", "a", "otra");
    anotar("s1", "b", "bien");
    anotar("s1", "a", "bien"); // volvió en la misma ronda: no cambia lo que costó
    const [s] = useRepasoStore.getState().sesiones;
    assert.equal(useRepasoStore.getState().sesiones.length, 1);
    assert.deepEqual(s!.resultados, [{ id: "a", cal: "otra" }, { id: "b", cal: "bien" }]);
    assert.deepEqual(lasQueCostaron(s!), ["a"]);
  });

  it("de cada mazo se conservan solo los repasos más recientes", () => {
    for (let i = 0; i < MAX_SESIONES_POR_MAZO + 5; i++) anotar(`s${i}`, "a", "bien");
    anotar("otro", "z", "bien", false, "m2");
    const delMazo = useRepasoStore.getState().sesiones.filter((s) => s.mazoId === "m1");
    assert.equal(delMazo.length, MAX_SESIONES_POR_MAZO);
    assert.equal(delMazo[0]!.id, "s5");
    assert.equal(useRepasoStore.getState().sesiones.filter((s) => s.mazoId === "m2").length, 1);
  });

  it("borrar un mazo borra también su historial", () => {
    const id = useRepasoStore.getState().crearMazo("X");
    anotar("s1", "a", "bien", false, id);
    useRepasoStore.getState().borrarMazo(id);
    assert.equal(useRepasoStore.getState().sesiones.length, 0);
  });

  it("practicar usa todo el mazo, aunque no toque hoy; estudiar, solo lo pendiente", () => {
    const tarjetas = [nueva({ id: "a", vence: 0 }), nueva({ id: "b", vence: Date.now() + 9 * DIA }), nueva({ id: "x", mazoId: "m2" })];
    assert.deepEqual(idsDeRonda({ tarjetas, sesiones: [] }, "m1", false), ["a"]);
    assert.deepEqual([...idsDeRonda({ tarjetas, sesiones: [] }, "m1", true)].sort(), ["a", "b"]);
    // con el azar fijo en 0 la mezcla es predecible
    assert.deepEqual(idsDeRonda({ tarjetas, sesiones: [] }, "m1", true, null, false, () => 0), ["b", "a"]);
  });

  it("se puede repetir un repaso anterior, entero o solo lo que costó, saltando las tarjetas borradas", () => {
    const tarjetas = [nueva({ id: "a" }), nueva({ id: "b" })];
    const sesiones = [{ id: "s1", mazoId: "m1", fecha: AHORA, practica: false, resultados: [{ id: "a", cal: "otra" as const }, { id: "b", cal: "bien" as const }, { id: "borrada", cal: "otra" as const }] }];
    assert.deepEqual(idsDeRonda({ tarjetas, sesiones }, "m1", true, "s1"), ["a", "b"]);
    assert.deepEqual(idsDeRonda({ tarjetas, sesiones }, "m1", true, "s1", true), ["a"]);
    assert.deepEqual(idsDeRonda({ tarjetas, sesiones }, "m1", true, "no-existe"), []);
  });

  it("dice cuándo toca lo siguiente, en días de calendario", () => {
    const tarjetas = [nueva({ id: "a", vence: AHORA + 3 * DIA }), nueva({ id: "b", vence: AHORA + DIA }), nueva({ id: "c", vence: 0 })];
    assert.equal(proximoRepaso(tarjetas, "m1", AHORA), AHORA + DIA);
    assert.equal(proximoRepaso([nueva({ vence: 0 })], "m1", AHORA), null);
    assert.equal(diasHasta(AHORA, AHORA), 0);
    assert.equal(diasHasta(AHORA + DIA, AHORA), 1);
    assert.equal(diasHasta(AHORA - DIA, AHORA), 0);
  });

  it("descarta del historial guardado lo que venga roto", () => {
    const bueno = { id: "s", mazoId: "m", fecha: 1, practica: true, resultados: [{ id: "a", cal: "bien" }, { id: "b", cal: "regular" }, 7] };
    const leidas = normalizarSesiones([bueno, null, { id: "sin-fecha", mazoId: "m", resultados: [] }, { id: "vacia", mazoId: "m", fecha: 1, resultados: [] }]);
    assert.deepEqual(leidas, [{ id: "s", mazoId: "m", fecha: 1, practica: true, resultados: [{ id: "a", cal: "bien" }] }]);
    assert.deepEqual(normalizarSesiones("nada"), []);
  });
});
