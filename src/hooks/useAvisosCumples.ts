"use client";

import { useEffect } from "react";
import { claveFecha, diasHastaIso, fechaDesdeIso, fechaLarga, inicioDelDia, proximoCumple } from "@/lib/calendario/fechas";
import { useCalendarioStore } from "@/store/calendario-store";

export function textoAviso(nombre: string, dias: number, edad: number | null, fecha: Date): { titulo: string; texto: string } {
  const cumple = edad ? ` y cumple ${edad}` : "";
  if (dias === 0) return { titulo: `Hoy cumple años ${nombre}`, texto: `¡No olvides felicitarle!${edad ? ` Cumple ${edad}.` : ""}` };
  if (dias === 1) return { titulo: `Mañana cumple años ${nombre}`, texto: `Es ${fechaLarga(fecha)}${cumple}.` };
  return { titulo: `En ${dias} días cumple años ${nombre}`, texto: `Será el ${fechaLarga(fecha)}${cumple}.` };
}

export function textoAvisoEvento(titulo: string, dias: number, fecha: Date): { titulo: string; texto: string } {
  if (dias === 0) return { titulo: `Hoy: ${titulo}`, texto: `Es ${fechaLarga(fecha)}.` };
  if (dias === 1) return { titulo: `Mañana: ${titulo}`, texto: `Es ${fechaLarga(fecha)}.` };
  return { titulo: `En ${dias} días: ${titulo}`, texto: `Será el ${fechaLarga(fecha)}.` };
}

/** Envía una notificación del sistema, si el usuario dio permiso. Devuelve true si se envió. */
export function notificarSistema(titulo: string, cuerpo: string, etiqueta?: string): boolean {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  try {
    new Notification(titulo, { body: cuerpo, tag: etiqueta, silent: false });
    return true;
  } catch {
    return false;
  }
}

/**
 * Revisa los cumpleaños Y los eventos generales al abrir la aplicación y cada minuto. Cuando llega la hora
 * elegida, avisa una sola vez por cada uno y anticipación (el mismo día, un día antes, una semana antes): con
 * una notificación del sistema si hay permiso, y siempre con un aviso dentro de la aplicación. Los avisos
 * funcionan mientras NexusHub esté abierto: una página web no puede avisar estando cerrada.
 */
export function useAvisosCumples() {
  useEffect(() => {
    useCalendarioStore.getState().cargar();

    const revisar = () => {
      const st = useCalendarioStore.getState();
      const ahora = new Date();
      if (ahora.getHours() < st.avisos.hora) return; // aún no es la hora elegida
      const hoy = inicioDelDia(ahora);
      const anticipaciones = [st.avisos.mismoDia && 0, st.avisos.unDiaAntes && 1, st.avisos.unaSemanaAntes && 7].filter((x): x is number => x !== false);

      for (const amigo of st.amigos) {
        if (!amigo.avisar) continue;
        const p = proximoCumple(amigo, hoy);
        if (!anticipaciones.includes(p.dias)) continue;
        const clave = `${amigo.id}|${claveFecha(p.fecha)}|${p.dias}`;
        if (st.yaAvisado(clave)) continue;
        st.marcarAvisado(clave);
        const { titulo, texto } = textoAviso(amigo.nombre, p.dias, p.edad, p.fecha);
        notificarSistema(titulo, texto, clave);
        st.mostrarAviso({ titulo, texto });
      }

      for (const evento of st.eventos) {
        if (!evento.avisar) continue;
        const dias = diasHastaIso(evento.fecha, hoy);
        if (!anticipaciones.includes(dias)) continue;
        const clave = `evento:${evento.id}|${evento.fecha}|${dias}`;
        if (st.yaAvisado(clave)) continue;
        st.marcarAvisado(clave);
        const { titulo, texto } = textoAvisoEvento(evento.titulo, dias, fechaDesdeIso(evento.fecha));
        notificarSistema(titulo, texto, clave);
        st.mostrarAviso({ titulo, texto });
      }
    };

    revisar();
    const id = setInterval(revisar, 60_000);
    // Al volver a la ventana (p. ej. tras suspender el equipo) se revisa de inmediato.
    const alVolver = () => document.visibilityState === "visible" && revisar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);
}
