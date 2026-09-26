"use client";

import { useSyncExternalStore } from "react";

const suscribir = (aviso: () => void) => {
  window.addEventListener("online", aviso);
  window.addEventListener("offline", aviso);
  return () => {
    window.removeEventListener("online", aviso);
    window.removeEventListener("offline", aviso);
  };
};

/** ¿Hay conexión a internet? Cambia solo cuando Windows avisa de que se cae o vuelve (en el servidor y al abrir se supone que sí). */
export function useEnLinea(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );
}
