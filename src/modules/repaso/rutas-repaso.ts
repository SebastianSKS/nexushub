/** Rutas internas de Repaso: el mazo abierto y el modo estudio viajan como parámetros de consulta. */
export const rutaMazo = (id: string) => `/repaso?mazo=${encodeURIComponent(id)}`;
export const rutaEstudio = (id: string) => `/repaso?mazo=${encodeURIComponent(id)}&modo=estudio`;
