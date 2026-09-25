"use client";

import { useEffect } from "react";
import { esEscritorio } from "@/lib/entorno";

const PREFIJO = "nexushub-";
const VERSION = 1;
const CADA_MS = 5_000;

/**
 * Datos que el usuario puede quitar a propósito (cerrar sesión). Si al cerrar sesión se dejó su marca, esa
 * clave no se recupera del respaldo: sería «resucitar» algo que la persona borró.
 */
const MARCA_DE_BAJA: Record<string, string> = {
  "nexushub-perfil": "nexushub-sesion-cerrada",
  "nexushub-spotify-tokens": "nexushub-spotify-cerrada",
};

type Copia = { version?: number; datos?: Record<string, unknown> };

/** Foto instantánea de todo lo que Nexo guarda (perfil, ajustes, canales, favoritos, calendario, notas…). */
function instantanea(): Record<string, string> {
  const datos: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const clave = window.localStorage.key(i);
    if (!clave || !clave.startsWith(PREFIJO)) continue;
    const valor = window.localStorage.getItem(clave);
    if (valor !== null) datos[clave] = valor;
  }
  return datos;
}

/**
 * Recupera, ANTES de que arranque la aplicación, lo que falte en el almacenamiento de la ventana (WebView2) y sí esté en
 * las copias de `AppData/Roaming/NexusHub/` (el último respaldo y, si allí no está, las copias archivadas).
 *
 * Tiene que ir primero: si la aplicación arranca con el almacenamiento vacío, cada pantalla escribe sus valores de fábrica
 * (los canales sugeridos, el recorrido de bienvenida…) y, al estar ya escritos, la recuperación ya no los tocaba: la
 * persona perdía sus canales cada vez que Windows cerraba el programa a la fuerza. Solo se añade lo que falta: nunca se pisa
 * lo que ya hay. Devuelve cuántas cosas recuperó.
 */
export async function restaurarRespaldo(): Promise<number> {
  if (!esEscritorio()) return 0;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const leer = (t: string | null): Copia | null => {
      try {
        return t ? (JSON.parse(t) as Copia) : null;
      } catch {
        return null;
      }
    };
    const ultimo = leer(await invoke<string | null>("leer_respaldo"));
    const historial = (await invoke<string[]>("leer_historial_respaldo").catch(() => [])).map(leer);
    const copias = [ultimo, ...historial].filter((c): c is Copia => !!c?.datos && c.version === VERSION);
    const claves = new Set(copias.flatMap((c) => Object.keys(c.datos ?? {})));
    let recuperados = 0;
    for (const clave of claves) {
      if (!clave.startsWith(PREFIJO) || window.localStorage.getItem(clave) !== null) continue;
      const marca = MARCA_DE_BAJA[clave];
      if (marca && window.localStorage.getItem(marca) !== null) continue;
      const valor = copias.map((c) => c.datos?.[clave]).find((v) => typeof v === "string");
      if (typeof valor === "string") {
        window.localStorage.setItem(clave, valor);
        recuperados++;
      }
    }
    return recuperados;
  } catch {
    return 0; // sin respaldo legible: se sigue con lo que haya
  }
}

/** Mantiene al día la copia en `AppData/Roaming/NexusHub/respaldo.json` (cada pocos segundos y al cerrar u ocultar la ventana). */
export function useRespaldoLocal() {
  useEffect(() => {
    if (!esEscritorio()) return;
    let temporizador: ReturnType<typeof setInterval> | undefined;
    let quitarEscuchas: (() => void) | undefined;
    let cancelado = false;

    void (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      if (cancelado) return;
      let ultimo = "";
      const guardar = () => {
        const datos = instantanea();
        if (Object.keys(datos).length === 0) return; // almacenamiento vacío: no se pisa una copia buena con nada
        const texto = JSON.stringify({ version: VERSION, datos });
        if (texto === ultimo) return;
        ultimo = texto;
        void invoke("guardar_respaldo", { contenido: texto }).catch(() => {
          ultimo = ""; // que se reintente en la siguiente vuelta
        });
      };
      guardar();
      temporizador = setInterval(guardar, CADA_MS);
      window.addEventListener("pagehide", guardar);
      document.addEventListener("visibilitychange", guardar);
      quitarEscuchas = () => {
        window.removeEventListener("pagehide", guardar);
        document.removeEventListener("visibilitychange", guardar);
      };
    })();

    return () => {
      cancelado = true;
      if (temporizador) clearInterval(temporizador);
      quitarEscuchas?.();
    };
  }, []);
}
