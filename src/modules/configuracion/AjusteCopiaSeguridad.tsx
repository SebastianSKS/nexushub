"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { InfoBar } from "@/components/fluent/InfoBar";
import { TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { aplicarCopia, crearCopia, leerCopia, MAX_BYTES_COPIA, nombreDeCopia, resumirCopia, type CopiaDatos } from "@/lib/copia";
import { esEscritorio } from "@/lib/entorno";
import { useT } from "@/lib/i18n";
import { descargar } from "@/services/documents/download";

async function versionDeLaApp(): Promise<string> {
  if (!esEscritorio()) return "web";
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return await getVersion();
  } catch {
    return "";
  }
}

/**
 * «Copia de seguridad»: guarda un archivo con todo lo tuyo (ajustes, perfil, horario, calendario, canales, favoritos y
 * notas) y lo restaura en esta u otra computadora. No incluye tu sesión de Spotify: se puede compartir sin regalar tu cuenta.
 */
export function AjusteCopiaSeguridad() {
  const t = useT();
  const entrada = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<{ tipo: "success" | "error" | "info"; texto: string } | null>(null);
  const [pendiente, setPendiente] = useState<CopiaDatos | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const guardar = async () => {
    setOcupado(true);
    setAviso(null);
    try {
      const copia = crearCopia(window.localStorage, await versionDeLaApp());
      const r = await descargar(new Blob([JSON.stringify(copia, null, 2)], { type: "application/json" }), nombreDeCopia());
      if (!r.cancelado) setAviso({ tipo: "success", texto: r.ruta ? t("Copia guardada en «{ruta}».", { ruta: r.ruta }) : t("Copia guardada.") });
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof Error ? e.message : t("No se pudo guardar la copia.") });
    } finally {
      setOcupado(false);
    }
  };

  const elegir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setAviso(null);
    if (archivo.size > MAX_BYTES_COPIA) return setAviso({ tipo: "error", texto: t("El archivo es demasiado grande para ser una copia de Nexo.") });
    const lectura = leerCopia(await archivo.text());
    if (!lectura.ok) return setAviso({ tipo: "error", texto: t(lectura.motivo) });
    setPendiente(lectura.copia);
  };

  const restaurar = () => {
    if (!pendiente) return;
    try {
      aplicarCopia(pendiente, window.localStorage);
      setPendiente(null);
      setAviso({ tipo: "success", texto: t("Copia restaurada. Nexo se va a recargar…") });
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      setPendiente(null);
      setAviso({ tipo: "error", texto: t("No se pudo restaurar la copia.") });
    }
  };

  const r = pendiente ? resumirCopia(pendiente) : null;
  const partes = r
    ? [
        r.eventos > 0 && t("{n} eventos", { n: r.eventos }),
        r.clases > 0 && t("{n} clases", { n: r.clases }),
        r.cumpleanos > 0 && t("{n} cumpleaños", { n: r.cumpleanos }),
        r.canales > 0 && t("{n} canales", { n: r.canales }),
        r.favoritos > 0 && t("{n} favoritos de música", { n: r.favoritos }),
        r.notas > 0 && t("{n} apuntes", { n: r.notas }),
        r.tienePerfil && t("tu perfil"),
      ].filter(Boolean)
    : [];

  return (
    <>
      <TarjetaAjuste glifo="descargar" titulo={t("Guardar una copia de seguridad")} descripcion={t("Un archivo con tus ajustes, perfil, horario, calendario, canales, favoritos y apuntes. No incluye tu sesión de Spotify.")}>
        <Button onClick={() => void guardar()} disabled={ocupado}>
          {t("Guardar copia")}
        </Button>
      </TarjetaAjuste>
      <TarjetaAjuste glifo="cargar" titulo={t("Restaurar desde una copia")} descripcion={t("Para pasar todo a otra computadora o volver atrás. Lo que trae la copia reemplaza a lo de ahora.")}>
        <Button onClick={() => entrada.current?.click()}>{t("Elegir copia…")}</Button>
        <input ref={entrada} type="file" accept="application/json,.json" className="hidden" aria-label={t("Elegir un archivo de copia de seguridad")} onChange={(e) => { void elegir(e.target.files?.[0]); e.target.value = ""; }} />
      </TarjetaAjuste>
      {aviso && (
        <InfoBar severity={aviso.tipo} title={aviso.texto} onClose={() => setAviso(null)} />
      )}
      <Dialog open={pendiente !== null} onClose={() => setPendiente(null)} title={t("¿Restaurar esta copia?")} maxWidth={460}>
        <div className="flex flex-col gap-4">
          <p className="text-body text-fg">
            {partes.length > 0 ? t("La copia trae: {lista}.", { lista: partes.join(", ") }) : t("La copia trae tus ajustes.")}
            {pendiente?.creada && ` ${t("Se hizo el {fecha}.", { fecha: new Date(pendiente.creada).toLocaleDateString() })}`}
          </p>
          <p className="text-caption text-fg-secondary">{t("Lo que trae la copia reemplaza a lo que tienes ahora; lo que la copia no trae se queda como está. Nexo se recargará al terminar.")}</p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setPendiente(null)}>{t("Cancelar")}</Button>
            <Button variant="accent" onClick={restaurar}>
              {t("Restaurar")}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
