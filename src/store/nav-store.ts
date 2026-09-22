import { create } from "zustand";

/**
 * Lo que el atajo Escape necesita saber de la página actual: cuál es su "padre" en la jerarquía.
 * Lo escribe PlantillaPagina; no decide qué pantalla se ve (eso lo hace la URL).
 */
interface NavState {
  padre: string | null;
  setPadre: (p: string | null) => void;
}

export const useNavStore = create<NavState>((set) => ({
  padre: null,
  setPadre: (padre) => set({ padre }),
}));
