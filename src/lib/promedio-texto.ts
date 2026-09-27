import { T, traducir } from "@/lib/i18n";
import { escribirNumero, type EstadoMateria, type Escala, type Necesario } from "@/lib/promedio";

const NOMBRE_ESTADO: Record<EstadoMateria, string> = {
  "sin-datos": T("Sin calificaciones todavía"),
  "en-curso": T("En curso"),
  "en-riesgo": T("En riesgo"),
  asegurada: T("Asegurada"),
  perdida: T("Perdida"),
  aprobada: T("Aprobada"),
  reprobada: T("Reprobada"),
};

/** El estado de una materia, en una o dos palabras y en el idioma de ahora. */
export const textoDeEstado = (estado: EstadoMateria): string => traducir(NOMBRE_ESTADO[estado]);

/** Lo que hay que hacer para aprobar, escrito como una frase corta. `pendiente` es el porcentaje que falta por calificar. */
export function fraseDeNecesario(n: Necesario, escala: Escala, pendiente: number): string {
  const minimo = escribirNumero(escala.minimoAprobatorio);
  switch (n.tipo) {
    case "necesitas":
      return traducir("Necesitas al menos {n} en lo que falta ({p} % de la materia).", { n: escribirNumero(n.calificacion), p: escribirNumero(pendiente) });
    case "aprobada":
      return traducir("Con lo que llevas ya alcanzas el mínimo para aprobar ({m}).", { m: minimo });
    case "terminada":
      return n.aprobada ? traducir("Materia terminada: aprobaste.") : traducir("Materia terminada: no llegaste al mínimo ({m}).", { m: minimo });
    case "imposible":
      return traducir("Ni con {max} en lo que falta llegarías al mínimo ({m}): lo máximo que alcanzarías es {x}.", { max: escribirNumero(escala.maximo), m: minimo, x: escribirNumero(n.maxima) });
  }
}

/** Un aviso cuando los pesos de las evaluaciones no suman 100 %; null si suman justo eso. */
export function avisoDePesos(suma: number): string | null {
  const s = Math.round(suma * 10) / 10;
  if (s === 100) return null;
  return s > 100
    ? traducir("Los pesos suman {n} %: se pasan del 100 %.", { n: escribirNumero(s) })
    : traducir("Los pesos suman {n} %: aún falta repartir el {r} %.", { n: escribirNumero(s), r: escribirNumero(100 - s) });
}
