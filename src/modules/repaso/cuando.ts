import { traducir } from "@/lib/i18n";
import { diasHasta } from "@/store/repaso-store";

/** «hoy», «mañana» o «en N días», para decir cuándo vuelve a tocar una tarjeta. */
export function cuandoToca(fecha: number, ahora = Date.now()): string {
  const dias = diasHasta(fecha, ahora);
  if (dias === 0) return traducir("hoy");
  if (dias === 1) return traducir("mañana");
  return traducir("en {n} días", { n: dias });
}
