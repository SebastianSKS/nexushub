"use client";

import { useEffect } from "react";
import { notificarSistema } from "@/lib/notificar";
import { claveFecha, fechaLarga, inicioDelDia, proximaOcurrenciaEvento, proximoCumple } from "@/lib/calendario/fechas";
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

/**
 * Revisa los cumpleaños Y los eventos generales al abrir la aplicación y cada minuto. Cuando llega la hora
 * elegida, avisa una sola vez por cada uno y anticipación (el mismo día, un día antes, una semana antes): con
 * una notificación del sistema si hay permiso, y siempre con un aviso dentro de la aplicación. Los avisos
 * funcionan mientras NexusHub esté abierto (aunque sea en la bandeja): un programa cerrado no puede avisar.
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
        notificarSistema(titulo, texto, clave, "/calendario");
        st.mostrarAviso({ titulo, texto });
      }

      for (const evento of st.eventos) {
        if (!evento.avisar) continue;
        const p = proximaOcurrenciaEvento(evento.fecha, evento.repetir, hoy);
        if (!p || !anticipaciones.includes(p.dias)) continue;
        // La ocurrencia (no la fecha de inicio) entra en la clave: así un evento que se repite avisa cada vez.
        const clave = `evento:${evento.id}|${claveFecha(p.fecha)}|${p.dias}`;
        if (st.yaAvisado(clave)) continue;
        st.marcarAvisado(clave);
        const { titulo, texto } = textoAvisoEvento(evento.titulo, p.dias, p.fecha);
        notificarSistema(titulo, texto, clave, "/calendario");
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
