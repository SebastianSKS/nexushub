"use client";

import { useT, traducir } from "@/lib/i18n";
import { Button } from "@/components/fluent/Button";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { useActualizacionesStore, type EstadoActualizacion } from "@/store/actualizaciones-store";

const texto = (estado: EstadoActualizacion, version: string | null, progreso: number | null): string => {
  switch (estado) {
    case "buscando":
      return traducir("Buscando actualizaciones…");
    case "al-dia":
      return traducir("Ya tienes la última versión.");
    case "disponible":
      return traducir("Hay una versión nueva: Nexo {version}.", { version: version ?? "" });
    case "descargando":
      return progreso !== null ? traducir("Descargando la actualización… {n} %", { n: progreso }) : traducir("Descargando la actualización…");
    case "lista":
      return traducir("Instalada. Reinicia para terminar.");
    case "error":
      return traducir("No se pudo comprobar. Revisa tu conexión a internet.");
    default:
      return traducir("Nexo busca solo al abrir. También puedes comprobarlo ahora.");
  }
};

/** Busca, descarga e instala actualizaciones desde el repositorio configurado en tauri.conf.json. Comparte estado con el aviso «Actualizar ahora». */
export function AjusteActualizaciones() {
  const t = useT();
  const escritorio = useEsEscritorio();
  const { estado, version, progreso } = useActualizacionesStore();
  const buscar = useActualizacionesStore((s) => s.buscar);
  const instalar = useActualizacionesStore((s) => s.instalar);
  const reiniciar = useActualizacionesStore((s) => s.reiniciar);

  if (!escritorio) return null;

  return (
    <TarjetaAjuste glifo="actualizar" titulo={t("Actualizaciones")} descripcion={texto(estado, version, progreso)}>
      {estado === "lista" ? (
        <Button variant="accent" onClick={() => void reiniciar()}>
          {t("Reiniciar ahora")}
        </Button>
      ) : estado === "disponible" ? (
        <Button variant="accent" onClick={() => void instalar()}>
          {t("Actualizar ahora")}
        </Button>
      ) : (
        <Button onClick={() => void buscar()} disabled={estado === "buscando" || estado === "descargando"}>
          {t("Buscar actualizaciones")}
        </Button>
      )}
    </TarjetaAjuste>
  );
}
