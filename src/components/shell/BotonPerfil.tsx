"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Tooltip } from "@/components/fluent/Tooltip";
import { usePerfilStore } from "@/store/perfil-store";
import { Avatar } from "./Avatar";
import { DialogoPerfil } from "./DialogoPerfil";

/** Fila de perfil al pie de la barra lateral: foto y nombre, o «Iniciar sesión (opcional)». */
export function BotonPerfil({ colapsado }: { colapsado: boolean }) {
  const t = useT();
  const cargar = usePerfilStore((s) => s.cargar);
  const nombre = usePerfilStore((s) => s.nombre);
  const foto = usePerfilStore((s) => s.foto);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => cargar(), [cargar]);

  const etiqueta = nombre ? t("Perfil de {nombre}", { nombre }) : t("Iniciar sesión (opcional)");
  return (
    <>
      <Tooltip text={etiqueta} enabled={colapsado}>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label={etiqueta}
          className={clsx("rounded-control reveal mb-1 flex h-12 w-full items-center gap-3 pl-2 pr-3 text-left transition-colors duration-exit ease-fluent hover:bg-layer")}
        >
          <Avatar nombre={nombre} foto={foto} tam={32} />
          <span className={clsx("min-w-0 transition-opacity duration-exit ease-fluent", colapsado ? "opacity-0" : "opacity-100")} aria-hidden>
            <span className="block truncate text-body font-semibold text-fg">{nombre ?? t("Iniciar sesión")}</span>
            <span className="block truncate text-caption text-fg-secondary">{nombre ? t("Ver o cambiar mi perfil") : t("Opcional · añade tu foto")}</span>
          </span>
        </button>
      </Tooltip>
      <DialogoPerfil abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  );
}
