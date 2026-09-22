/**
 * Puente entre el atajo global de Espacio y el reproductor. El reproductor persistente
 * registra aquí su «alternar»; el atajo no necesita conocer sus detalles.
 */
let alternar: (() => boolean) | null = null;

export function registrarAlternar(fn: (() => boolean) | null): void {
  alternar = fn;
}

/** true si había algo que reproducir o pausar (y por tanto Espacio debe cancelar su acción por defecto). */
export function togglePlayback(): boolean {
  return alternar ? alternar() : false;
}
