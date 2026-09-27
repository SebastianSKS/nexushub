import { create } from "zustand";
import { evaluacionesIniciales, normalizarPromedio, type DatosPromedio, type Escala, type Evaluacion, type Materia } from "@/lib/promedio";
import { conEscala, conEvaluacionCambiada, conEvaluacionNueva, conMateriaCambiada, conMateriaNueva, sinEvaluacion, sinMateria } from "@/lib/promedio-datos";

/** Empieza con «nexushub-»: entra en la copia de seguridad y en la copia automática. */
export const CLAVE_PROMEDIO = "nexushub-promedio";

function leer(): DatosPromedio {
  try {
    return normalizarPromedio(JSON.parse(window.localStorage.getItem(CLAVE_PROMEDIO) ?? "null"));
  } catch {
    return normalizarPromedio(null); // almacenamiento bloqueado o JSON dañado
  }
}

function guardar(datos: DatosPromedio) {
  try {
    window.localStorage.setItem(CLAVE_PROMEDIO, JSON.stringify(datos));
  } catch {
    /* modo incógnito: dura solo esta sesión */
  }
}

interface PromedioState extends DatosPromedio {
  cargado: boolean;
  cargar: () => void;
  cambiarEscala: (escala: Escala) => void;
  /** Crea una materia con las evaluaciones de arranque (o las que se den) y devuelve su id. */
  agregarMateria: (nombre: string, nombresEvaluaciones: readonly [string, string, string, string], evaluaciones?: Evaluacion[]) => string;
  quitarMateria: (id: string) => void;
  cambiarMateria: (id: string, cambios: Partial<Pick<Materia, "nombre" | "creditos">>) => void;
  agregarEvaluacion: (materiaId: string, nombre: string, peso: number) => void;
  quitarEvaluacion: (materiaId: string, evaluacionId: string) => void;
  cambiarEvaluacion: (materiaId: string, evaluacionId: string, cambios: Partial<Pick<Evaluacion, "nombre" | "peso" | "calificacion">>) => void;
}

/** Calificaciones por materia y evaluación, para saber cómo vas y cuánto necesitas sacar. Todo se guarda en el equipo. */
export const usePromedioStore = create<PromedioState>((set, get) => {
  const aplicar = (siguiente: DatosPromedio) => {
    set({ escala: siguiente.escala, materias: siguiente.materias });
    guardar(siguiente);
  };
  const datos = (): DatosPromedio => ({ escala: get().escala, materias: get().materias });
  const nuevoId = () => crypto.randomUUID();

  return {
    cargado: false,
    ...normalizarPromedio(null),

    cargar: () => {
      if (get().cargado) return;
      set({ cargado: true, ...leer() });
    },

    cambiarEscala: (escala) => aplicar(conEscala(datos(), escala)),

    agregarMateria: (nombre, nombresEvaluaciones, evaluaciones) => {
      const id = nuevoId();
      const limpio = nombre.trim().slice(0, 60);
      if (!limpio) return "";
      aplicar(conMateriaNueva(datos(), { id, nombre: limpio, creditos: 1, evaluaciones: evaluaciones ?? evaluacionesIniciales(nuevoId, nombresEvaluaciones) }));
      return id;
    },

    quitarMateria: (id) => aplicar(sinMateria(datos(), id)),
    cambiarMateria: (id, cambios) => aplicar(conMateriaCambiada(datos(), id, cambios)),

    agregarEvaluacion: (materiaId, nombre, peso) =>
      aplicar(conEvaluacionNueva(datos(), materiaId, { id: nuevoId(), nombre: nombre.slice(0, 60), peso: Math.min(100, Math.max(0, peso)), calificacion: null })),

    quitarEvaluacion: (materiaId, evaluacionId) => aplicar(sinEvaluacion(datos(), materiaId, evaluacionId)),
    cambiarEvaluacion: (materiaId, evaluacionId, cambios) => aplicar(conEvaluacionCambiada(datos(), materiaId, evaluacionId, cambios)),
  };
});
