import { siguienteEnEspera, useColaStore, type Trabajo } from "@/store/cola-store";
import type { ResultItem } from "@/types/documents";
import { describeError, isAbort } from "./errors";

/**
 * Quien procesa la cola: un trabajo a la vez y en el orden en que se pusieron (las conversiones pesan, y Office no admite
 * dos a la vez). Si uno falla o se cancela, sigue con el siguiente. No sabe nada de pantallas: lo que hace cada trabajo
 * y lo que se avisa llega desde fuera, así se puede probar solo.
 */
export interface Dependencias {
  ejecutar: (trabajo: Trabajo, ganchos: { signal: AbortSignal; onProgress: (progreso: number, mensaje: string) => void }) => Promise<{ results: ResultItem[]; warnings: string[] }>;
  alAvanzar?: (trabajo: Trabajo) => void;
  alTerminar?: (trabajo: Trabajo) => void;
  alFallar?: (trabajo: Trabajo) => void;
  /** Ya no queda nada en espera; recibe los que salieron bien en esta tanda. */
  alVaciar?: (hechos: Trabajo[]) => void;
}

export function crearProcesador(dep: Dependencias) {
  let actual: { id: string; control: AbortController } | null = null;
  let corriendo = false;

  const leer = (id: string) => useColaStore.getState().trabajos.find((t) => t.id === id)!;
  const cambiar = (id: string, cambios: Partial<Trabajo>) => useColaStore.getState().cambiar(id, cambios);

  /** Empieza a procesar si no estaba haciéndolo. Lo que se añada mientras tanto se atiende solo. */
  async function arrancar(): Promise<void> {
    if (corriendo) return;
    corriendo = true;
    const hechos: string[] = [];
    try {
      for (let t = siguienteEnEspera(useColaStore.getState().trabajos); t; t = siguienteEnEspera(useColaStore.getState().trabajos)) {
        const { id } = t;
        const control = new AbortController();
        actual = { id, control };
        cambiar(id, { estado: "procesando", progreso: 0, mensaje: "" });
        dep.alAvanzar?.(leer(id));
        try {
          const r = await dep.ejecutar(leer(id), {
            signal: control.signal,
            onProgress: (progreso, mensaje) => {
              cambiar(id, { progreso: Math.max(leer(id).progreso, progreso), mensaje });
              dep.alAvanzar?.(leer(id));
            },
          });
          // Hay pasos que no se pueden interrumpir a la mitad (Office): si se canceló mientras tanto, el resultado se descarta.
          if (control.signal.aborted) {
            cambiar(id, { estado: "cancelado", progreso: 0 });
            continue;
          }
          cambiar(id, { estado: "listo", progreso: 100, mensaje: "", resultados: r.results, avisos: r.warnings });
          hechos.push(id);
          dep.alTerminar?.(leer(id));
        } catch (e) {
          if (isAbort(e) || control.signal.aborted) cambiar(id, { estado: "cancelado", progreso: 0 });
          else {
            cambiar(id, { estado: "error", progreso: 0, error: describeError(e) });
            dep.alFallar?.(leer(id));
          }
        }
      }
    } finally {
      actual = null;
      corriendo = false;
      dep.alVaciar?.(useColaStore.getState().trabajos.filter((t) => hechos.includes(t.id)));
    }
  }

  /** Cancela el que se está procesando; si estaba esperando, lo saca de la cola. */
  function cancelar(id: string): void {
    if (actual?.id === id) actual.control.abort();
    else if (leer(id)?.estado === "esperando") useColaStore.getState().quitar(id);
  }

  /** Saca los que esperan y detiene el que está en marcha. */
  function cancelarTodo(): void {
    for (const t of useColaStore.getState().trabajos) if (t.estado === "esperando") useColaStore.getState().quitar(t.id);
    actual?.control.abort();
  }

  return { arrancar, cancelar, cancelarTodo };
}
