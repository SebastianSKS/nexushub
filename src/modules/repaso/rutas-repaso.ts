/** Rutas internas de Repaso: el mazo abierto y el modo estudio viajan como parámetros de consulta. */
export const rutaMazo = (id: string) => `/repaso?mazo=${encodeURIComponent(id)}`;
export const rutaEstudio = (id: string) => `/repaso?mazo=${encodeURIComponent(id)}&modo=estudio`;

/** Práctica (no cambia cuándo toca cada tarjeta): todo el mazo, o un repaso anterior (entero o solo las que costaron). */
export const rutaPractica = (id: string, sesionId?: string, soloCostaron = false) =>
  `/repaso?mazo=${encodeURIComponent(id)}&modo=practica${sesionId ? `&sesion=${encodeURIComponent(sesionId)}` : ""}${soloCostaron ? "&costaron=1" : ""}`;
