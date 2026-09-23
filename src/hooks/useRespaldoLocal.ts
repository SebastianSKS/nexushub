"use client";

import { useEffect } from "react";
import { esEscritorio } from "@/lib/entorno";

const PREFIJO = "nexushub-";
const VERSION = 1;
/** Con cada arranque se restaura como mucho una vez: si algo saliera mal, nunca se cae en un bucle de recargas. */
const CLAVE_RESTAURADO = "nexushub-respaldo-restaurado";
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

/** Foto instantánea de todo lo que NexusHub guarda (perfil, ajustes, canales, favoritos, calendario, notas…). */
function instantanea(): Record<string, string> {
  const datos: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const clave = window.localStorage.key(i);
    if (!clave || !clave.startsWith(PREFIJO) || clave === CLAVE_RESTAURADO) continue;
    const valor = window.localStorage.getItem(clave);
    if (valor !== null) datos[clave] = valor;
  }
  return datos;
}

/**
 * Los datos del usuario viven en el almacenamiento de la ventana (WebView2), que se guarda en una carpeta
 * del sistema. Si esa carpeta se pierde —se desinstala borrando datos, se limpia, o el programa se cierra a
 * la fuerza antes de que Windows escriba lo último—, el perfil y todo lo demás desaparecían y NexusHub
 * volvía a preguntar «¿quién eres?».
 *
 * Solución: cada pocos segundos se guarda una copia en `AppData/Roaming/NexusHub/respaldo.json` (fuera de
 * esa carpeta). Al abrir, todo lo que falte en el almacenamiento y sí esté en la copia se recupera. Solo se
 * añade lo que falta: nunca se pisa lo que ya hay.
 */
export function useRespaldoLocal() {
  useEffect(() => {
    if (!esEscritorio()) return;
    let cancelado = false;
    let temporizador: ReturnType<typeof setInterval> | undefined;
    let quitarEscuchas: (() => void) | undefined;

    void (async () => {
      const { invoke } = await import("@tauri-apps/api/core");

      // 1) Recuperar lo que falte: primero del último respaldo y, si allí no está, de las copias archivadas.
      try {
        if (!window.sessionStorage.getItem(CLAVE_RESTAURADO)) {
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
          if (recuperados > 0) {
            window.sessionStorage.setItem(CLAVE_RESTAURADO, "1");
            window.location.reload(); // los datos se leen al iniciar cada pantalla: se recarga para que los vea
            return;
          }
        }
      } catch {
        /* sin respaldo legible: se sigue con lo que haya */
      }
      if (cancelado) return;

      // 2) Mantener la copia al día.
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
