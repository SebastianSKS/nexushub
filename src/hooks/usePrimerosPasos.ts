"use client";

import { useEffect, useState } from "react";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { debeMostrarse, pasosDe, progresoDe, type EstadoPasos, type PasoDef, type PasoId, type Progreso } from "@/lib/primeros-pasos";
import { listarCarpetas } from "@/services/carpetas";
import { useCalendarioStore } from "@/store/calendario-store";
import { useGuiasStore } from "@/store/guias-store";
import { useHorarioStore } from "@/store/horario-store";
import { useNovedadesStore } from "@/store/novedades-store";
import { usePerfilStore } from "@/store/perfil-store";
import { usePrimerosPasosStore } from "@/store/primeros-pasos-store";

/** Cuánto se queda a la vista el «¡Listo!» al terminar el último paso, antes de despedirse. */
const MS_CELEBRACION = 6000;

export interface PasoConEstado extends PasoDef {
  hecho: boolean;
}

export interface VistaPrimerosPasos {
  /** ¿Hay que dibujar la tarjeta? (nunca antes de la bienvenida, ni encima de otra guía). */
  visible: boolean;
  /** Acabó de completarse y se está despidiendo. */
  celebrando: boolean;
  pasos: PasoConEstado[];
  progreso: Progreso;
  descartar: () => void;
}

/**
 * Qué pasos están hechos y cuánto falta, mirando los datos de verdad (nombre, horario, eventos, carpetas y lo anotado al probar
 * la búsqueda). Sin efectos raros: se puede usar en cualquier pantalla (Inicio, Configuración).
 */
export function useEstadoPasos() {
  const escritorio = useEsEscritorio() === true;
  const nombre = usePerfilStore((s) => s.nombre);
  const clases = useHorarioStore((s) => s.clases.length);
  const eventos = useCalendarioStore((s) => s.eventos.length);
  const guardado = usePrimerosPasosStore();

  useEffect(() => {
    usePrimerosPasosStore.getState().cargar();
    usePerfilStore.getState().cargar();
    useHorarioStore.getState().cargar();
    useCalendarioStore.getState().cargar();
  }, []);

  // Las carpetas de materias que ya existían (de antes de esta lista, o creadas desde fuera) también cuentan.
  useEffect(() => {
    if (!escritorio || guardado.carpetas) return;
    void listarCarpetas()
      .then((c) => c.length > 0 && usePrimerosPasosStore.getState().marcar("carpetas"))
      .catch(() => {});
  }, [escritorio, guardado.carpetas]);

  const estado: EstadoPasos = { nombre: Boolean(nombre), horario: clases > 0, carpetas: guardado.carpetas, examen: eventos > 0, buscador: guardado.buscador };
  return { escritorio, estado, progreso: progresoDe(estado, escritorio), guardado };
}

/**
 * Junta lo que hace falta para la lista de primeros pasos de Inicio: qué se hizo ya (mirando los datos de verdad: nombre,
 * horario, eventos, carpetas y lo que se anotó al probar la búsqueda), y si toca mostrarla sin pisar la guía de bienvenida,
 * otras guías ni las novedades. A quien ya lo tenía todo hecho no se la muestra nunca.
 */
export function usePrimerosPasos(): VistaPrimerosPasos {
  const { escritorio, estado, progreso, guardado } = useEstadoPasos();
  const guiasCargadas = useGuiasStore((s) => s.cargado);
  const bienvenidaVista = useGuiasStore((s) => s.vistas.includes("bienvenida"));
  const guiaAbierta = useGuiasStore((s) => s.abierta !== null);
  const novedadesAbiertas = useNovedadesStore((s) => s.abiertas !== null);
  const [celebrando, setCelebrando] = useState(false);

  useEffect(() => {
    useGuiasStore.getState().cargar();
  }, []);

  const cargado = guardado.cargado && guiasCargadas;
  const mostrar = debeMostrarse({ guardado, progreso, cargado, bienvenidaVista, algoAbierto: guiaAbierta || novedadesAbiertas });
  useEffect(() => {
    if (mostrar) usePrimerosPasosStore.getState().marcarVista();
  }, [mostrar]);

  // Al completar el último paso: si la tarjeta estaba a la vista, se celebra un momento; si ya estaba todo hecho, ni sale.
  useEffect(() => {
    if (!cargado || !progreso.completo || guardado.completado) return;
    if (!guardado.vistaEnSesion) {
      usePrimerosPasosStore.getState().completar();
      return;
    }
    setCelebrando(true);
    const fin = window.setTimeout(() => {
      setCelebrando(false);
      usePrimerosPasosStore.getState().completar();
    }, MS_CELEBRACION);
    return () => window.clearTimeout(fin);
  }, [cargado, progreso.completo, guardado.completado, guardado.vistaEnSesion]);

  const pasos = pasosDe(escritorio).map((p) => ({ ...p, hecho: estado[p.id as PasoId] }));
  return { visible: mostrar || celebrando, celebrando, pasos, progreso, descartar: () => usePrimerosPasosStore.getState().descartar() };
}
