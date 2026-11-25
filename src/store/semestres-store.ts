import { create } from "zustand";
import type { Clase } from "@/lib/horario/horario";
import { empezarSemestre, MAX_NOMBRE_SEMESTRE, nombreDePeriodo, normalizarSemestres, periodoEn, volverASemestre, type DatosSemestres } from "@/lib/horario/semestres";
import { useHorarioStore } from "@/store/horario-store";

const CLAVE = "nexushub-semestres";

function escribir(datos: DatosSemestres) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch {
    /* modo incógnito: dura solo esta sesión */
  }
}

interface SemestresState extends DatosSemestres {
  cargado: boolean;
  cargar: () => void;
  renombrar: (nombre: string) => void;
  /** Guarda el semestre de ahora y empieza otro con las clases que se indiquen (ninguna, o una copia de las de ahora). */
  empezar: (nombre: string, clasesIniciales: Clase[]) => void;
  /** Vuelve a usar un semestre guardado (el de ahora se guarda en su lugar). */
  volverA: (id: string) => void;
  borrar: (id: string) => void;
}

const horario = () => {
  useHorarioStore.getState().cargar();
  return useHorarioStore.getState();
};

const sinId = (clases: Clase[]) => clases.map(({ id, ...resto }) => (void id, resto));

export const useSemestresStore = create<SemestresState>((set, get) => {
  const datos = (): DatosSemestres => ({ actual: get().actual, anteriores: get().anteriores });
  const aplicar = (nuevos: DatosSemestres) => {
    set(nuevos);
    escribir(nuevos);
  };

  return {
    cargado: false,
    actual: "",
    anteriores: [],

    cargar: () => {
      if (get().cargado) return;
      const porDefecto = nombreDePeriodo(periodoEn(new Date()));
      let crudo: unknown = null;
      try {
        crudo = JSON.parse(window.localStorage.getItem(CLAVE) ?? "null");
      } catch {
        crudo = null;
      }
      const leidos = normalizarSemestres(crudo, porDefecto);
      set({ cargado: true, ...leidos });
      // La primera vez se fija el nombre, para que no cambie solo cuando pase el calendario.
      if (crudo === null) escribir(leidos);
    },

    renombrar: (nombre) => {
      const limpio = nombre.trim().slice(0, MAX_NOMBRE_SEMESTRE);
      if (limpio) aplicar({ ...datos(), actual: limpio });
    },

    empezar: (nombre, clasesIniciales) => {
      const nuevos = empezarSemestre(datos(), horario().clases, nombre, crypto.randomUUID());
      aplicar(nuevos); // primero se guarda el que termina: así, pase lo que pase, no se pierde
      horario().reemplazar(sinId(clasesIniciales));
    },

    volverA: (id) => {
      const r = volverASemestre(datos(), id, horario().clases, crypto.randomUUID());
      if (!r) return;
      aplicar(r.datos);
      horario().reemplazar(sinId(r.clases));
    },

    borrar: (id) => aplicar({ ...datos(), anteriores: get().anteriores.filter((x) => x.id !== id) }),
  };
});
