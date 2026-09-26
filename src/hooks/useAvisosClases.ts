"use client";

import { traducir } from "@/lib/i18n";
import { useEffect } from "react";
import { claveFecha } from "@/lib/calendario/fechas";
import { itemsDelDia } from "@/lib/calendario/items";
import { aMinutos, clasesDelDia, diaDeSemana } from "@/lib/horario/horario";
import { notificarSistema } from "@/lib/notificar";
import { useAjustesStore } from "@/store/ajustes-store";
import { useCalendarioStore, type AvisoPantalla } from "@/store/calendario-store";
import { useHorarioStore } from "@/store/horario-store";
import { usePerfilStore } from "@/store/perfil-store";

/** Pasada esta hora, el resumen «de hoy» ya no tiene sentido: se salta. */
const HORA_LIMITE_RESUMEN = 14;

/**
 * Avisos del horario, con notificaciones de Windows y también dentro de la aplicación:
 *  - unos minutos antes de cada clase (5, 10, 15 o 30, a elección), con el aula y el docente;
 *  - un resumen del día a la hora elegida: clases, tareas y eventos, cumpleaños.
 * Cada aviso sale una sola vez por día (se recuerda aunque cierres y abras Nexo). Funcionan mientras la
 * aplicación esté abierta, aunque sea en la bandeja: un programa cerrado no puede avisar.
 */
export function useAvisosClases() {
  useEffect(() => {
    useHorarioStore.getState().cargar();
    useCalendarioStore.getState().cargar();
    usePerfilStore.getState().cargar();

    // Cada aviso lleva a lo que anuncia: una clase, al Horario; el resumen del día, al Inicio (donde está «Lo que sigue hoy»).
    const avisar = (clave: string, titulo: string, texto: string, destino: NonNullable<AvisoPantalla["destino"]>) => {
      const cal = useCalendarioStore.getState();
      if (cal.yaAvisado(clave)) return;
      cal.marcarAvisado(clave);
      void notificarSistema(titulo, texto, clave, destino.ruta);
      cal.mostrarAviso({ titulo, texto, destino });
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
          const donde = [c.aula ? traducir("Aula {aula}", { aula: c.aula }) : "", c.docente].filter(Boolean).join(" · ");
          avisar(`clase:${c.id}|${hoy}`, traducir("{materia} empieza en {faltan} min", { materia: c.materia, faltan }), `${c.inicio}–${c.fin}${donde ? ` · ${donde}` : ""}`, { ruta: "/horario", etiqueta: traducir("Abrir el horario"), glifo: "reloj" });
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
          partes.push(c.aula ? traducir("Primera clase: {inicio} {materia} (Aula {aula}).", { inicio: c.inicio, materia: c.materia, aula: c.aula }) : traducir("Primera clase: {inicio} {materia}.", { inicio: c.inicio, materia: c.materia }));
        }
        const eventos = items.filter((i) => i.tipo === "evento").map((i) => i.titulo);
        const cumples = items.filter((i) => i.tipo === "amigo").map((i) => i.titulo);
        if (eventos.length > 0) partes.push(traducir("Hoy: {lista}.", { lista: `${eventos.slice(0, 3).join(", ")}${eventos.length > 3 ? "…" : ""}` }));
        if (cumples.length > 0) partes.push(traducir("Cumpleaños: {lista}.", { lista: cumples.join(", ") }));
        const nClases = clases.length === 1 ? traducir("1 clase") : traducir("{n} clases", { n: clases.length });
        const nPendientes = eventos.length === 1 ? traducir("1 pendiente") : traducir("{n} pendientes", { n: eventos.length });
        const cuenta = eventos.length > 0 ? traducir("{clases} y {pendientes}", { clases: nClases, pendientes: nPendientes }) : nClases;
        const titulo = nombre ? traducir("{nombre}, hoy tienes {cuenta}", { nombre, cuenta }) : traducir("Hoy tienes {cuenta}", { cuenta });
        avisar(clave, titulo, partes.join(" "), { ruta: "/inicio", etiqueta: traducir("Ver mi día"), glifo: "inicio" });
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
