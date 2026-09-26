"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QuestionCircle16Regular } from "@fluentui/react-icons";
import clsx from "clsx";
import { Glifo } from "@/components/fluent/Glifo";
import { useHistorial } from "@/hooks/useHistorial";
import { esEscritorio } from "@/lib/entorno";
import { GUIAS, guiaDeRuta } from "@/lib/guias";
import { useGuiasStore } from "@/store/guias-store";
import type { NombreGlifo } from "@/lib/glifos";
import { GlobalSearch } from "./GlobalSearch";
import { NexusMark } from "./NexusMark";

/** Acciones de ventana de Tauri. Solo se importan (y solo se muestran) en la app de escritorio. */
async function ventana() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

interface BotonVentanaProps {
  etiqueta: string;
  glifo: NombreGlifo;
  peligro?: boolean;
  onClick: () => void;
}

/** 46×32 px, hover gris al 6 %; «Cerrar» en rojo #C42B1C, como la barra de título de Windows 11. */
function BotonVentana({ etiqueta, glifo, peligro, onClick }: BotonVentanaProps) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      className={clsx(
        "flex h-8 w-[46px] items-center justify-center text-fg transition-colors duration-exit ease-fluent",
        peligro ? "hover:bg-[#C42B1C] hover:text-white" : "hover:bg-[rgba(128,128,128,0.06)]",
      )}
    >
      <Glifo nombre={glifo} tam={10} />
    </button>
  );
}

/**
 * El signo de interrogación de la barra de arriba: vuelve a mostrar la guía de la sección en la que se está
 * (en Inicio, la bienvenida). Así, si a alguien se le olvida algo, lo repasa cuando quiera.
 */
function BotonAyuda() {
  const t = useT();
  const ruta = usePathname();
  const id = guiaDeRuta(ruta);
  if (!id) return null;
  const nombre = id === "bienvenida" ? t("la bienvenida") : t("«{nombre}»", { nombre: t(GUIAS[id].nombre) });
  return (
    <button
      type="button"
      onClick={() => useGuiasStore.getState().abrir(id)}
      aria-label={t("Ayuda: cómo funciona {nombre}", { nombre })}
      title={t("Ayuda: cómo funciona {nombre}", { nombre })}
      className="flex h-8 w-10 items-center justify-center text-fg transition-colors duration-exit ease-fluent hover:bg-[rgba(128,128,128,0.06)]"
    >
      <QuestionCircle16Regular />
    </button>
  );
}

/**
 * Barra de título de 32 px, arrastrable: [←] icono + Nexo · buscador global · controles de ventana.
 * El «atrás» vive AQUÍ (patrón de Windows) y es HISTORIAL: router.back(). Se atenúa cuando no hay a dónde regresar.
 */
export function BarraTitulo() {
  const t = useT();
  const router = useRouter();
  const { puedeAtras } = useHistorial();
  const [escritorio, setEscritorio] = useState(false);
  const [maximizada, setMaximizada] = useState(false);

  useEffect(() => {
    if (!esEscritorio()) return;
    setEscritorio(true);
    void ventana().then(async (w) => {
      setMaximizada(await w.isMaximized());
      await w.onResized(async () => setMaximizada(await w.isMaximized()));
    });
  }, []);

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={(e) => {
        // Doble clic en la zona vacía alterna maximizado (solo en escritorio).
        if (escritorio && e.target === e.currentTarget) void ventana().then((w) => w.toggleMaximize());
      }}
      className="relative z-30 grid h-8 shrink-0 grid-cols-[1fr_auto_1fr] items-center"
    >
      <div data-tauri-drag-region className="flex min-w-0 items-center">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={!puedeAtras}
          aria-label={t("Atrás")}
          title={t("Atrás (Alt + ←)")}
          className="flex h-8 w-10 shrink-0 items-center justify-center text-fg transition-colors duration-exit ease-fluent hover:bg-[rgba(128,128,128,0.06)] disabled:pointer-events-none disabled:opacity-40"
        >
          <Glifo nombre="atras" tam={14} />
        </button>
        <div data-tauri-drag-region className="flex items-center gap-2 pl-1">
          <NexusMark size={16} />
          <span data-tauri-drag-region className="text-caption text-fg">
            Nexo
          </span>
        </div>
      </div>

      <GlobalSearch />

      <div data-tauri-drag-region className="flex justify-end">
        <BotonAyuda />
        {escritorio && (
          <>
            <BotonVentana etiqueta={t("Minimizar")} glifo="minimizar" onClick={() => void ventana().then((w) => w.minimize())} />
            <BotonVentana
              etiqueta={maximizada ? t("Restaurar") : t("Maximizar")}
              glifo={maximizada ? "restaurar" : "maximizar"}
              onClick={() => void ventana().then((w) => w.toggleMaximize())}
            />
            <BotonVentana etiqueta={t("Cerrar")} glifo="cerrar" peligro onClick={() => void ventana().then((w) => w.close())} />
          </>
        )}
      </div>
    </header>
  );
}
