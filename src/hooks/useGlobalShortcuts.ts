"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { togglePlayback } from "@/lib/playback";
import { SECCIONES_PRINCIPALES } from "@/lib/rutas";
import { isInteractiveTarget, isTypingTarget } from "@/lib/shortcuts";
import { useAppStore } from "@/store/app-store";
import { useNavStore } from "@/store/nav-store";

/** ¿Hay un diálogo modal, un menú o el buscador abierto? Escape debe cerrarlos a ellos primero. */
function hayCapaAbierta(): boolean {
  return (
    useAppStore.getState().searchOpen ||
    document.querySelector("[role=dialog][aria-modal=true], [role=menu], [role=alertdialog]") !== null
  );
}

/**
 * Atajos globales. La navegación pasa SIEMPRE por el router (la URL manda):
 *   Alt+← / Alt+→ · botones 4 y 5 del mouse   historial (router.back / forward)
 *   Escape                                    sube un nivel en la jerarquía (la miga anterior)
 *   Ctrl+1/2/3 · Ctrl+K · Espacio · ?
 */
export function useGlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useAppStore.getState();
      const mod = e.ctrlKey || e.metaKey;

      // Historial
      if (e.altKey && !mod && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault(); // evita que el motor navegue por su cuenta y se salte dos entradas
        if (e.key === "ArrowLeft") router.back();
        else router.forward();
        return;
      }

      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setSearchOpen(true);
        return;
      }

      if (mod && !e.shiftKey && !e.altKey) {
        const destino = SECCIONES_PRINCIPALES.find((x) => x.atajo === e.key);
        if (destino) {
          e.preventDefault();
          router.push(destino.ruta);
          return;
        }
      }

      if (e.key === "Escape") {
        if (hayCapaAbierta()) return; // lo cierra el propio diálogo, menú o buscador
        const padre = useNavStore.getState().padre;
        if (padre) {
          e.preventDefault();
          router.push(padre);
        }
        return;
      }

      // Espacio: reproducir / pausar, salvo que el foco esté en un campo o control que ya lo use.
      if ((e.code === "Space" || e.key === " ") && !mod && !e.altKey && !e.shiftKey && !isInteractiveTarget(e.target)) {
        if (togglePlayback()) e.preventDefault();
        return;
      }

      if (e.key === "?" && !mod && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        router.push("/atajos");
      }
    };

    // Botones laterales del mouse: 3 = atrás, 4 = adelante. Se cancela también el mouseup/auxclick
    // porque Chromium navega en esos eventos y, sin cancelarlos, el historial retrocedería dos veces.
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 3 && e.button !== 4) return;
      e.preventDefault();
      if (e.button === 3) router.back();
      else router.forward();
    };
    const cancelar = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("mousedown", cancelar);
    window.addEventListener("mouseup", cancelar);
    window.addEventListener("auxclick", cancelar);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("mousedown", cancelar);
      window.removeEventListener("mouseup", cancelar);
      window.removeEventListener("auxclick", cancelar);
    };
  }, [router]);
}
