/**
 * Consejos de un solo uso: un aviso breve que aparece justo después de que la persona hace algo por primera vez («guardaste tu
 * primera clase → te avisaremos antes de cada una»). Enseñan en el momento en que sirven, sin tapar nada y sin repetirse.
 * Aquí solo la lógica pura: qué consejos hay y CUÁNDO puede salir uno. El texto y el aviso están en `store/consejos-store.ts`.
 */

export const CONSEJOS_IDS = ["primera-clase", "primer-evento-con-hora", "primera-carpeta", "primer-resultado"] as const;
export type ConsejoId = (typeof CONSEJOS_IDS)[number];

export const esConsejoId = (x: unknown): x is ConsejoId => typeof x === "string" && (CONSEJOS_IDS as readonly string[]).includes(x);

/** Entre un consejo y otro se espera al menos esto, para no llenar la pantalla de avisos a quien hace varias cosas seguidas. */
export const ESPERA_ENTRE_CONSEJOS_MS = 25_000;

/** Los consejos ya vistos, leídos de lo guardado (cualquier cosa): solo cuentan los que existen, sin repetidos. */
export function normalizarVistos(crudo: unknown): ConsejoId[] {
  return Array.isArray(crudo) ? [...new Set(crudo.filter(esConsejoId))] : [];
}

export interface EntornoDeConsejo {
  vistos: readonly ConsejoId[];
  /** Hay una guía o el cuadro de novedades a la vista: el consejo espera para no apilarse encima. */
  algoAbierto: boolean;
  /** Cuándo (ms) salió el último consejo, o 0 si ninguno en esta sesión. */
  ultimoEn: number;
  ahora: number;
  /** Los consejos se pueden apagar del todo. */
  activos?: boolean;
}

/** ¿Puede salir este consejo ahora? No si ya se vio, si hay una guía abierta, si salió otro hace poco o si están apagados. */
export function puedeMostrarse(id: ConsejoId, e: EntornoDeConsejo): boolean {
  if (e.activos === false) return false;
  if (e.vistos.includes(id)) return false;
  if (e.algoAbierto) return false;
  return e.ultimoEn === 0 || e.ahora - e.ultimoEn >= ESPERA_ENTRE_CONSEJOS_MS;
}
