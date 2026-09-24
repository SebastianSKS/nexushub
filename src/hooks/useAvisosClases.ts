"use client";

import { useEffect } from "react";
import { claveFecha } from "@/lib/calendario/fechas";
import { itemsDelDia } from "@/lib/calendario/items";
import { aMinutos, clasesDelDia, diaDeSemana } from "@/lib/horario/horario";
import { notificarSistema } from "@/lib/notificar";
import { useAjustesStore } from "@/store/ajustes-store";
import { useCalendarioStore } from "@/store/calendario-store";
import { useHorarioStore } from "@/store/horario-store";
import { usePerfilStore } from "@/store/perfil-store";

/** Pasada esta hora, el resumen «de hoy» ya no tiene sentido: se salta. */
const HORA_LIMITE_RESUMEN = 14;

/**
 * Avisos del horario, con notificaciones de Windows y también dentro de la aplicación:
 *  - unos minutos antes de cada clase (5, 10, 15 o 30, a elección), con el aula y el docente;
 *  - un resumen del día a la hora elegida: clases, tareas y eventos, cumpleaños.
 * Cada aviso sale una sola vez por día (se recuerda aunque cierres y abras NexusHub). Funcionan mientras la
 * aplicación esté abierta, aunque sea en la bandeja: un programa cerrado no puede avisar.
 */
export function useAvisosClases() {
  useEffect(() => {
    useHorarioStore.getState().cargar();
    useCalendarioStore.getState().cargar();
    usePerfilStore.getState().cargar();

    const avisar = (clave: string, titulo: string, texto: string) => {
      const cal = useCalendarioStore.getState();
      if (cal.yaAvisado(clave)) return;
      cal.marcarAvisado(clave);
      void notificarSistema(titulo, texto, clave);
      cal.mostrarAviso({ titulo, texto });
    };

    const revisar = () => {
      const aj = useAjustesStore.getState();
      const ahora = new Date();
      const hoy = claveFecha(ahora);
      const minutos = ahora.getHours() * 60 + ahora.getMinutes();
      const clases = clasesDelDia(useHorarioStore.getState().clases, diaDeSemana(ahora));

      // Antes de cada clase.
      if (aj.avisoClaseMin > 0) {
        for (const c of clases) {
          const faltan = aMinutos(c.inicio) - minutos;
          if (faltan <= 0 || faltan > aj.avisoClaseMin) continue; // aún falta mucho, o ya empezó
          const donde = [c.aula ? `Aula ${c.aula}` : "", c.docente].filter(Boolean).join(" · ");
          avisar(`clase:${c.id}|${hoy}`, `${c.materia} empieza en ${faltan} min`, `${c.inicio}–${c.fin}${donde ? ` · ${donde}` : ""}`);
        }
      }

      // Resumen del día.
      if (aj.resumenDia && minutos >= aj.resumenHora * 60 && ahora.getHours() < HORA_LIMITE_RESUMEN) {
        const clave = `resumen:${hoy}`;
        const cal = useCalendarioStore.getState();
        if (cal.yaAvisado(clave)) return;
        const items = itemsDelDia(cal.amigos, cal.eventos, ahora);
        if (clases.length === 0 && items.length === 0) {
          cal.marcarAvisado(clave); // nada que contar hoy: no se molesta
          return;
        }
        const nombre = usePerfilStore.getState().nombre;
        const partes: string[] = [];
        if (clases.length > 0) {
          const c = clases[0]!;
          partes.push(`Primera clase: ${c.inicio} ${c.materia}${c.aula ? ` (Aula ${c.aula})` : ""}.`);
        }
        const eventos = items.filter((i) => i.tipo === "evento").map((i) => i.titulo);
        const cumples = items.filter((i) => i.tipo === "amigo").map((i) => i.titulo);
        if (eventos.length > 0) partes.push(`Hoy: ${eventos.slice(0, 3).join(", ")}${eventos.length > 3 ? "…" : ""}.`);
        if (cumples.length > 0) partes.push(`Cumpleaños: ${cumples.join(", ")}.`);
        const titulo = `${nombre ? `${nombre}, hoy` : "Hoy"} tienes ${clases.length} ${clases.length === 1 ? "clase" : "clases"}${eventos.length > 0 ? ` y ${eventos.length} ${eventos.length === 1 ? "pendiente" : "pendientes"}` : ""}`;
        avisar(clave, titulo, partes.join(" "));
      }
    };

    revisar();
    const id = setInterval(revisar, 30_000);
    // Al volver a la ventana (por ejemplo, tras suspender el equipo) se revisa de inmediato.
    const alVolver = () => document.visibilityState === "visible" && revisar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);
}
