import { create } from "zustand";

/**
 * Lo que la ventana necesita saber de la navegación: cuál es el «padre» de la página actual (para Escape; lo escribe
 * PlantillaPagina) y la última pantalla fuera de Configuración, para regresar a ella. No decide qué pantalla se ve
 * (eso lo hace la URL).
 */
interface NavState {
  padre: string | null;
  setPadre: (p: string | null) => void;
  /** Adónde regresa «Inicio» en la barra de Configuración. */
  volverA: string;
  recordar: (ruta: string) => void;
}

export const useNavStore = create<NavState>((set) => ({
  padre: null,
  setPadre: (padre) => set({ padre }),
  volverA: "/inicio",
  recordar: (volverA) => set({ volverA }),
}));
