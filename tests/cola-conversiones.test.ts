import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";
import { planAPdf } from "../src/lib/documents/convertir-todo.ts";
import { crearProcesador } from "../src/services/documents/cola.ts";
import { DocumentError } from "../src/services/documents/errors.ts";
import { hayPendientes, useColaStore, type Trabajo } from "../src/store/cola-store.ts";
import { useDocumentsStore } from "../src/store/documents-store.ts";
import type { InputKind, QueuedFile, ResultItem, ToolId } from "../src/types/documents.ts";

const archivo = (nombre: string, kind: InputKind): QueuedFile => ({ id: nombre, kind, file: new File(["x"], nombre) });
const resultado = (name: string): ResultItem => ({ id: name, name, size: 1, mime: "application/pdf", blob: new Blob(["x"]) });
const agregar = (toolId: ToolId, ...files: QueuedFile[]) => useColaStore.getState().agregar({ toolId, files, options: {} });
const estados = () => useColaStore.getState().trabajos.map((t) => t.estado);

/** Una conversión de mentira que termina cuando la prueba lo diga. */
function ejecutorManual() {
  const llamadas: { trabajo: Trabajo; signal: AbortSignal; avanzar: (p: number) => void; terminar: () => void; fallar: (e: unknown) => void }[] = [];
  return {
    llamadas,
    ejecutar: (trabajo: Trabajo, g: { signal: AbortSignal; onProgress: (p: number, m: string) => void }) =>
      new Promise<{ results: ResultItem[]; warnings: string[] }>((ok, mal) => {
        llamadas.push({ trabajo, signal: g.signal, avanzar: (p) => g.onProgress(p, "paso"), terminar: () => ok({ results: [resultado(`${trabajo.toolId}.pdf`)], warnings: [] }), fallar: mal });
      }),
  };
}
const respiro = () => new Promise((r) => setImmediate(r));

beforeEach(() => useColaStore.setState({ trabajos: [] }));

describe("cola de conversiones", () => {
  it("hace una a la vez y en orden, aunque se añada otra mientras tanto", async () => {
    const m = ejecutorManual();
    const vaciada: Trabajo[][] = [];
    const p = crearProcesador({ ejecutar: m.ejecutar, alVaciar: (h) => vaciada.push(h) });
    agregar("word-to-pdf", archivo("a.docx", "word"));
    const fin = p.arrancar();
    agregar("excel-to-pdf", archivo("b.xlsx", "excel"));
    void p.arrancar(); // pulsar otra vez no arranca una segunda en paralelo
    assert.equal(m.llamadas.length, 1);
    assert.deepEqual(estados(), ["procesando", "esperando"]);
    m.llamadas[0]!.terminar();
    await respiro();
    assert.deepEqual(estados(), ["listo", "procesando"]);
    m.llamadas[1]!.terminar();
    await fin;
    assert.deepEqual(estados(), ["listo", "listo"]);
    assert.deepEqual(m.llamadas.map((c) => c.trabajo.toolId), ["word-to-pdf", "excel-to-pdf"]);
    assert.deepEqual(useColaStore.getState().trabajos.map((t) => t.resultados[0]!.name), ["word-to-pdf.pdf", "excel-to-pdf.pdf"]);
    assert.equal(vaciada.length, 1, "se avisa una sola vez, al acabar la tanda");
    assert.equal(vaciada[0]!.length, 2);
    assert.ok(!hayPendientes(useColaStore.getState().trabajos));
  });

  it("si una falla, guarda el motivo y sigue con la siguiente", async () => {
    const m = ejecutorManual();
    const fallidas: Trabajo[] = [];
    const p = crearProcesador({ ejecutar: m.ejecutar, alFallar: (t) => fallidas.push(t) });
    agregar("unlock-pdf", archivo("a.pdf", "pdf"));
    agregar("word-to-pdf", archivo("b.docx", "word"));
    const fin = p.arrancar();
    m.llamadas[0]!.fallar(new DocumentError("Contraseña incorrecta.", "Revísala."));
    await respiro();
    m.llamadas[1]!.terminar();
    await fin;
    assert.deepEqual(estados(), ["error", "listo"]);
    assert.deepEqual(fallidas.map((t) => t.error), [{ message: "Contraseña incorrecta.", hint: "Revísala." }]);
  });

  it("cancelar la que está en marcha pasa a la siguiente; cancelar una en espera la saca", async () => {
    const m = ejecutorManual();
    const p = crearProcesador({ ejecutar: m.ejecutar });
    const a = agregar("word-to-pdf", archivo("a.docx", "word"));
    const b = agregar("excel-to-pdf", archivo("b.xlsx", "excel"));
    agregar("merge", archivo("c.pdf", "pdf"));
    const fin = p.arrancar();
    p.cancelar(b);
    assert.deepEqual(estados(), ["procesando", "esperando"]);
    p.cancelar(a);
    assert.ok(m.llamadas[0]!.signal.aborted);
    m.llamadas[0]!.terminar(); // aunque Office termine de todos modos, el resultado se descarta
    await respiro();
    assert.equal(m.llamadas[1]!.trabajo.toolId, "merge");
    m.llamadas[1]!.fallar(new DOMException("cancelada", "AbortError"));
    await fin;
    assert.deepEqual(estados(), ["cancelado", "cancelado"]);
    assert.equal(useColaStore.getState().trabajos[0]!.resultados.length, 0);
  });

  it("cancelar todo vacía la espera y detiene la actual", async () => {
    const m = ejecutorManual();
    const p = crearProcesador({ ejecutar: m.ejecutar });
    agregar("word-to-pdf", archivo("a.docx", "word"));
    agregar("excel-to-pdf", archivo("b.xlsx", "excel"));
    const fin = p.arrancar();
    p.cancelarTodo();
    m.llamadas[0]!.fallar(new DOMException("cancelada", "AbortError"));
    await fin;
    assert.deepEqual(estados(), ["cancelado"]);
    assert.equal(m.llamadas.length, 1);
  });

  it("el avance nunca retrocede, y al terminar una tanda se puede empezar otra", async () => {
    const m = ejecutorManual();
    const p = crearProcesador({ ejecutar: m.ejecutar });
    agregar("compress", archivo("a.pdf", "pdf"));
    const fin = p.arrancar();
    m.llamadas[0]!.avanzar(60);
    m.llamadas[0]!.avanzar(20);
    assert.equal(useColaStore.getState().trabajos[0]!.progreso, 60);
    m.llamadas[0]!.terminar();
    await fin;
    agregar("compress", archivo("b.pdf", "pdf"));
    const otra = p.arrancar();
    m.llamadas[1]!.terminar();
    await otra;
    assert.deepEqual(estados(), ["listo", "listo"]);
  });

  it("quitar las terminadas deja las pendientes; la que se procesa no se puede quitar", () => {
    const a = agregar("compress", archivo("a.pdf", "pdf"));
    const b = agregar("compress", archivo("b.pdf", "pdf"));
    agregar("compress", archivo("c.pdf", "pdf"));
    useColaStore.getState().cambiar(a, { estado: "listo" });
    useColaStore.getState().cambiar(b, { estado: "procesando" });
    useColaStore.getState().quitar(b);
    assert.equal(estados().length, 3);
    useColaStore.getState().quitarTerminados();
    assert.deepEqual(estados(), ["procesando", "esperando"]);
  });
});

describe("iniciar cola desde Documentos", () => {
  it("hace un trabajo por tipo, junta las imágenes y deja los PDF", () => {
    const plan = planAPdf([archivo("a.docx", "word"), archivo("f1.png", "image"), archivo("b.xlsx", "excel"), archivo("ya.pdf", "pdf"), archivo("c.docx", "word"), archivo("f2.jpg", "image"), archivo("d.pptx", "powerpoint")]);
    assert.deepEqual(plan.map((p) => [p.toolId, p.files.map((f) => f.id)]), [
      ["word-to-pdf", ["a.docx", "c.docx"]],
      ["images-to-pdf", ["f1.png", "f2.jpg"]],
      ["excel-to-pdf", ["b.xlsx"]],
      ["powerpoint-to-pdf", ["d.pptx"]],
    ]);
    assert.deepEqual(planAPdf([archivo("ya.pdf", "pdf")]), []);
  });
});

describe("archivos mezclados en Documentos", () => {
  const nombres = (l: QueuedFile[]) => l.map((f) => f.id).sort();
  beforeEach(() => {
    mock.timers.enable({ apis: ["setTimeout"] }); // los avisos se quitan solos con un temporizador
    useDocumentsStore.setState({ toolId: null, files: [archivo("a.docx", "word"), archivo("b.xlsx", "excel")], apartados: [], notices: [] });
    return () => mock.timers.reset();
  });

  it("al abrir una herramienta, los que no son suyos esperan y no se pierden", () => {
    const s = () => useDocumentsStore.getState();
    s().selectTool("word-to-pdf");
    assert.deepEqual([nombres(s().files), nombres(s().apartados)], [["a.docx"], ["b.xlsx"]]);
    s().clearFiles(); // el Word se fue a la cola
    s().selectTool("excel-to-pdf");
    assert.deepEqual([nombres(s().files), nombres(s().apartados)], [["b.xlsx"], []]);
    s().selectTool(null);
    assert.deepEqual(nombres(s().files), ["b.xlsx"]);
    mock.timers.reset();
  });

  it("una herramienta sin archivos suyos se abre vacía y al volver están todos", () => {
    const s = () => useDocumentsStore.getState();
    s().selectTool("compress");
    assert.deepEqual([s().files.length, s().apartados.length], [0, 2]);
    s().selectTool(null);
    assert.deepEqual(nombres(s().files), ["a.docx", "b.xlsx"]);
    mock.timers.reset();
  });

  it("volver a abrir un trabajo al que le falten opciones no deja la pantalla sin ellas", () => {
    useDocumentsStore.getState().reabrir({ toolId: "unlock-pdf", files: [archivo("c.pdf", "pdf")], options: {} });
    assert.equal(useDocumentsStore.getState().options.unlockPdf.password, "");
    mock.timers.reset();
  });

  it("volver a abrir un trabajo recupera sus archivos y opciones sin borrar lo preparado", () => {
    const s = () => useDocumentsStore.getState();
    s().reabrir({ toolId: "unlock-pdf", files: [archivo("c.pdf", "pdf")], options: { password: "abc" } });
    s().selectTool("unlock-pdf"); // la pantalla de la herramienta se abre después: no debe borrar nada
    assert.deepEqual(nombres(s().files), ["c.pdf"]);
    assert.equal(s().options.unlockPdf.password, "abc");
    assert.deepEqual(nombres(s().apartados), ["a.docx", "b.xlsx"]);
    mock.timers.reset();
  });
});
