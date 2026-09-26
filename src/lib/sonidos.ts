/**
 * Los sonidos de los avisos de Nexo. Son propios: se «tocan» al momento con el audio del navegador (unas cuantas notas
 * sueltas), sin archivos que descargar ni derechos de nadie. También se puede elegir un sonido de Windows, o ninguno.
 */

export type IdSonidoNexo = "nexo-campana" | "nexo-gota" | "nexo-suave" | "nexo-arpegio" | "nexo-pulso";
export type IdSonidoWindows = "windows" | "windows-correo" | "windows-recordatorio" | "windows-sms" | "windows-mensaje";
/** Lo que se puede elegir en Configuración. */
export type SonidoAviso = IdSonidoNexo | IdSonidoWindows | "ninguno";

export const SONIDOS_NEXO_IDS: readonly IdSonidoNexo[] = ["nexo-campana", "nexo-gota", "nexo-suave", "nexo-arpegio", "nexo-pulso"];
export const SONIDOS_WINDOWS_IDS: readonly IdSonidoWindows[] = ["windows", "windows-correo", "windows-recordatorio", "windows-sms", "windows-mensaje"];
export const SONIDO_PREDETERMINADO: SonidoAviso = "nexo-campana";
export const VOLUMEN_AVISOS_PREDETERMINADO = 70;

/** Una nota: `inicio` y `duracion` en segundos desde que empieza el sonido; `volumen` de 0 a 1 (antes del volumen elegido). */
export interface Nota {
  frecuencia: number;
  inicio: number;
  duracion: number;
  onda: "sine" | "triangle" | "square";
  volumen: number;
}

const nota = (frecuencia: number, inicio: number, duracion: number, onda: Nota["onda"] = "sine", volumen = 0.5): Nota => ({ frecuencia, inicio, duracion, onda, volumen });

/** Las partituras. */
export const SONIDOS_NEXO: Record<IdSonidoNexo, readonly Nota[]> = {
  // Una campanita: una nota con sus armónicos, que se apaga despacio.
  "nexo-campana": [nota(880, 0, 1.1, "sine", 0.55), nota(1318.5, 0, 0.7, "sine", 0.25), nota(1760, 0, 0.35, "sine", 0.12)],
  // Una gota: sube y baja rápido.
  "nexo-gota": [nota(1244.5, 0, 0.14, "sine", 0.5), nota(830.6, 0.12, 0.3, "sine", 0.4)],
  // Dos notas suaves, una tras otra (do y mi).
  "nexo-suave": [nota(523.25, 0, 0.3, "sine", 0.5), nota(659.25, 0.18, 0.5, "sine", 0.5)],
  // Un arpegio corto y alegre (do-mi-sol-do).
  "nexo-arpegio": [nota(523.25, 0, 0.16, "triangle", 0.45), nota(659.25, 0.09, 0.16, "triangle", 0.45), nota(783.99, 0.18, 0.16, "triangle", 0.45), nota(1046.5, 0.27, 0.45, "triangle", 0.45)],
  // Dos toques secos y uno más agudo, para cuando no quieres perdértelo.
  "nexo-pulso": [nota(660, 0, 0.09, "square", 0.22), nota(660, 0.17, 0.09, "square", 0.22), nota(880, 0.34, 0.16, "square", 0.22)],
};

export const esSonidoNexo = (s: string): s is IdSonidoNexo => (SONIDOS_NEXO_IDS as readonly string[]).includes(s);
export const esSonidoWindows = (s: string): s is IdSonidoWindows => (SONIDOS_WINDOWS_IDS as readonly string[]).includes(s);
export const esSonidoAviso = (s: unknown): s is SonidoAviso => typeof s === "string" && (s === "ninguno" || esSonidoNexo(s) || esSonidoWindows(s));

/** Lo que dura el sonido entero, en segundos. */
export const duracionDe = (id: IdSonidoNexo): number => Math.max(...SONIDOS_NEXO[id].map((n) => n.inicio + n.duracion));

/** El volumen elegido (0–100) a ganancia: al oído el volumen no sube en línea recta, así que se eleva al cuadrado. */
export const volumenAGanancia = (volumen: number): number => {
  const v = Math.min(100, Math.max(0, Number.isFinite(volumen) ? volumen : 0)) / 100;
  return v * v;
};

let contexto: AudioContext | null = null;

/**
 * Toca un sonido de Nexo. Devuelve cuánto dura (en segundos) o 0 si no se pudo (sin audio, o volumen en 0). Nunca lanza:
 * un aviso sin sonido es mejor que uno que falla.
 */
export function reproducirSonidoNexo(id: IdSonidoNexo, volumen: number): number {
  const maestro = volumenAGanancia(volumen);
  if (maestro <= 0 || typeof window === "undefined") return 0;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return 0;
    contexto ??= new Ctx();
    if (contexto.state === "suspended") void contexto.resume();
    const ahora = contexto.currentTime + 0.02;
    for (const n of SONIDOS_NEXO[id]) {
      const osc = contexto.createOscillator();
      const ganancia = contexto.createGain();
      osc.type = n.onda;
      osc.frequency.value = n.frecuencia;
      // Entra rápido (sin «clic») y se apaga en curva: así suena a campana o a gota y no a pitido.
      const pico = Math.max(0.0001, n.volumen * maestro);
      ganancia.gain.setValueAtTime(0.0001, ahora + n.inicio);
      ganancia.gain.exponentialRampToValueAtTime(pico, ahora + n.inicio + 0.012);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + n.inicio + n.duracion);
      osc.connect(ganancia).connect(contexto.destination);
      osc.start(ahora + n.inicio);
      osc.stop(ahora + n.inicio + n.duracion + 0.05);
    }
    return duracionDe(id);
  } catch {
    return 0;
  }
}
