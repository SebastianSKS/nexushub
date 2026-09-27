/**
 * Nexo en equipos modestos. En una computadora con poca memoria o pocos núcleos, la transparencia de la ventana (Mica, Acrílico),
 * las animaciones y leer archivos en segundo plano pesan más de lo que se nota. El «modo de bajo consumo» los recorta: ventana
 * sin transparencia, menos movimiento y un indexado más pausado. Se enciende solo si el equipo parece modesto (o a mano).
 * Lógica pura: aquí solo se decide; quien la usa (ajustes, indexado) aplica lo decidido.
 */

export type ModoAhorro = "auto" | "si" | "no";

/** Lo que el navegador dice del equipo. `memoriaGB` viene redondeada por el navegador (0.25, 0.5, 1, 2, 4 u 8). */
export interface PistasDelEquipo {
  nucleos?: number;
  memoriaGB?: number;
}

/** Cuántos núcleos o cuánta memoria (o menos) se consideran «equipo modesto». */
export const NUCLEOS_MODESTO = 4;
export const MEMORIA_GB_MODESTA = 4;

/** ¿El equipo parece modesto? Si el navegador no da datos, se supone que no (mejor no recortar de más). */
export function equipoModesto(p: PistasDelEquipo): boolean {
  const pocosNucleos = typeof p.nucleos === "number" && p.nucleos > 0 && p.nucleos <= NUCLEOS_MODESTO;
  const pocaMemoria = typeof p.memoriaGB === "number" && p.memoriaGB > 0 && p.memoriaGB <= MEMORIA_GB_MODESTA;
  return pocosNucleos || pocaMemoria;
}

/** ¿Está el bajo consumo en marcha? «auto» lo decide el equipo; «si» y «no» mandan. */
export function ahorroActivo(modo: ModoAhorro, p: PistasDelEquipo): boolean {
  return modo === "si" || (modo === "auto" && equipoModesto(p));
}

/** Los datos del equipo que da el navegador (en escritorio, el de la ventana). Sin ventana, vacío. */
export function pistasDelEquipo(): PistasDelEquipo {
  if (typeof navigator === "undefined") return {};
  const n = navigator as Navigator & { deviceMemory?: number };
  return { nucleos: n.hardwareConcurrency, memoriaGB: n.deviceMemory };
}

/** Cómo se lee el archivo con lo guardado: solo «si» y «no» valen, lo demás es «auto». */
export const normalizarModoAhorro = (x: unknown): ModoAhorro => (x === "si" || x === "no" ? x : "auto");

/** Cuánto espera y cuánto respira el indexado de archivos (búsqueda en PDF y Office) según el modo. */
export interface PlanDeIndexado {
  /** Cuánto se espera tras abrir Nexo antes de empezar a leer (para no competir con el arranque). */
  esperaInicialMs: number;
  /** Pausa entre un archivo y el siguiente: deja respirar a la interfaz. */
  pausaEntreArchivosMs: number;
}

export function planDeIndexado(ahorro: boolean): PlanDeIndexado {
  return ahorro ? { esperaInicialMs: 30_000, pausaEntreArchivosMs: 120 } : { esperaInicialMs: 8_000, pausaEntreArchivosMs: 0 };
}

/** El efecto de ventana que de verdad se usa: en bajo consumo, ninguno (sin transparencia, que es lo que más pesa). */
export const efectoEfectivo = <E extends string>(elegido: E, ahorro: boolean, sinEfecto: E): E => (ahorro ? sinEfecto : elegido);

/** El movimiento que de verdad se usa: en bajo consumo, reducido salvo que se pida lo contrario a propósito. */
export function movimientoEfectivo(elegido: "sistema" | "si" | "no", ahorro: boolean): "sistema" | "si" | "no" {
  return ahorro && elegido === "sistema" ? "si" : elegido;
}
