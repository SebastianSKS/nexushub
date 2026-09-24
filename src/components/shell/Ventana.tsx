"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { useAvisoCancion } from "@/hooks/useAvisoCancion";
import { useAvisosCumples } from "@/hooks/useAvisosCumples";
import { useAvisosClases } from "@/hooks/useAvisosClases";
import { useNavegarDesdeAviso } from "@/hooks/useNavegarDesdeAviso";
import { useRespaldoLocal } from "@/hooks/useRespaldoLocal";
import { useBandeja } from "@/hooks/useBandeja";
import { useCerrarABandeja } from "@/hooks/useCerrarABandeja";
import { useDropGlobal } from "@/hooks/useDropGlobal";
import { useEfectoVentana } from "@/hooks/useEfectoVentana";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useRecientesMusica } from "@/hooks/useRecientesMusica";
import { useRevealHighlight } from "@/hooks/useRevealHighlight";
import { useTourAutomatico } from "@/hooks/useTourAutomatico";
import { useAjustesStore } from "@/store/ajustes-store";
import { useAppStore } from "@/store/app-store";
import { BarraReproduccion } from "@/components/reproductor/BarraReproduccion";
import { ReproductorGlobal } from "@/components/reproductor/ReproductorGlobal";
import { ReproductorGrande } from "@/components/reproductor/ReproductorGrande";
import { AvisosCumple } from "./AvisosCumple";
import { BarraTitulo } from "./BarraTitulo";
import { MemoriaSesion } from "./MemoriaSesion";
import { PanelNavegacion } from "./PanelNavegacion";
import { StatusBar } from "./StatusBar";
import { TourBienvenida } from "./TourBienvenida";

/** Por debajo de este ancho de ventana el panel de navegación se colapsa solo. */
const ANCHO_COLAPSO = 1000;

/**
 * Armazón fijo de la ventana. NUNCA se desmonta al navegar: solo `children` (el contenido de la página)
 * cambia. Eso es lo que permitirá que la música siga sonando mientras se cambia de sección.
 */
export function Ventana({ children }: { children: ReactNode }) {
  const cargarAjustes = useAjustesStore((s) => s.cargar);
  const colapsadoAuto = useRef(false);

  useGlobalShortcuts();
  useRevealHighlight();
  useAvisosCumples();
  useAvisosClases();
  useAvisoCancion();
  useNavegarDesdeAviso();
  useRecientesMusica();
  useEfectoVentana();
  useRespaldoLocal();
  useBandeja();
  useCerrarABandeja();
  useDropGlobal();
  useTourAutomatico();

  useEffect(() => {
    cargarAjustes();
  }, [cargarAjustes]);

  // Se colapsa solo por debajo de 1000 px, y se vuelve a expandir al ensanchar la ventana
  // (solo si fue este mecanismo el que lo colapsó: si el usuario lo colapsó, se respeta).
  useEffect(() => {
    const ajustar = () => {
      const { sidebarCollapsed, setSidebarCollapsed } = useAppStore.getState();
      if (window.innerWidth < ANCHO_COLAPSO && !sidebarCollapsed) {
        colapsadoAuto.current = true;
        setSidebarCollapsed(true);
      } else if (window.innerWidth >= ANCHO_COLAPSO && sidebarCollapsed && colapsadoAuto.current) {
        colapsadoAuto.current = false;
        setSidebarCollapsed(false);
      }
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#contenido"
        className="rounded-control absolute left-3 top-3 z-[60] -translate-y-[200%] bg-accent px-4 py-2 text-body text-accent-on focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      <div className="mica flex h-screen w-screen flex-col overflow-hidden rounded-window border border-stroke">
        <BarraTitulo />
        <div className="flex min-h-0 flex-1">
          <PanelNavegacion />
          <main
            id="contenido"
            tabIndex={-1}
            className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-tl-control border-l border-t border-stroke bg-layer"
          >
            {children}
          </main>
        </div>
        <BarraReproduccion />
        <StatusBar />
      </div>
      {/* Fuera del marco (.mica usa backdrop-filter y crearía un contexto que rompería position:fixed). */}
      <ReproductorGlobal />
      <ReproductorGrande />
      <AvisosCumple />
      <MemoriaSesion />
      <TourBienvenida />
    </MotionConfig>
  );
}
