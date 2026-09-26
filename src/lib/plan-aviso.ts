import { enHorasDeSilencio } from "./silencio.ts";
import { esSonidoNexo, esSonidoWindows, type IdSonidoNexo, type SonidoAviso } from "./sonidos.ts";

/**
 * Qué hacer con un aviso del sistema, decidido a partir de los ajustes (lógica pura, para poder probarla): si se manda o
 * se calla por «No molestar», qué sonido le toca poner al propio aviso de Windows y si Nexo debe tocar uno suyo.
 */
export interface AjustesDeAviso {
  sonidoAvisos: SonidoAviso;
  silencioActivo: boolean;
  silencioDesde: number;
  silencioHasta: number;
}

export interface OpcionesDePlan {
  /** Mandarlo aunque sea hora de «No molestar» (los avisos de prueba). */
  ignorarSilencio?: boolean;
  /** Con qué sonido, en vez del elegido en Configuración (para probar cada uno). */
  sonido?: SonidoAviso;
}

export interface PlanDeAviso {
  enviar: boolean;
  /** Lo que se le pasa al aviso de Windows: el sonido de Windows elegido, o «silencio» (suena Nexo, o nada). */
  sonidoDelAviso: string;
  /** El sonido de Nexo que hay que tocar desde la interfaz, o null. */
  tocarNexo: IdSonidoNexo | null;
  /** ¿Lleva sonido de Windows? (para la API web y el plugin, que solo saben de «con» o «sin» sonido). */
  conSonidoDeWindows: boolean;
}

export function planDeAviso(a: AjustesDeAviso, ahora: Date, opciones: OpcionesDePlan = {}): PlanDeAviso {
  const callado = !opciones.ignorarSilencio && enHorasDeSilencio(ahora, { activo: a.silencioActivo, desde: a.silencioDesde, hasta: a.silencioHasta });
  const elegido = opciones.sonido ?? a.sonidoAvisos;
  return {
    enviar: !callado,
    sonidoDelAviso: esSonidoWindows(elegido) ? elegido : "silencio",
    tocarNexo: esSonidoNexo(elegido) ? elegido : null,
    conSonidoDeWindows: esSonidoWindows(elegido),
  };
}
