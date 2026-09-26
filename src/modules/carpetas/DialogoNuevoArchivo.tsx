"use client";

import { useT, localeActual } from "@/lib/i18n";
import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { LogoPrograma } from "@/components/fluent/LogoPrograma";
import { Switch } from "@/components/fluent/Switch";
import { TextInput } from "@/components/fluent/TextInput";
import { abrirEnSistema, ErrorCarpetas, guardarArchivo } from "@/services/carpetas";
import { crearArchivoNuevo, NUEVOS, nombreDeArchivoNuevo, type TipoNuevo } from "@/services/documents/nuevos";

/**
 * «Nuevo archivo» dentro de la carpeta de una materia: un Word, un Excel, un PowerPoint o un texto en blanco,
 * guardado justo ahí (nunca pisa otro con el mismo nombre) y, si se quiere, abierto al instante para empezar a escribir.
 */
export function DialogoNuevoArchivo({ carpeta, ruta, onCerrar, onCreado }: { carpeta: string; ruta: string; onCerrar: () => void; onCreado: (nombre: string) => Promise<void> }) {
  const t = useT();
  const [tipo, setTipo] = useState<TipoNuevo>("word");
  const [nombre, setNombre] = useState("");
  const [abrir, setAbrir] = useState(true);
  const [error, setError] = useState<string>();
  const [ocupado, setOcupado] = useState(false);
  const info = NUEVOS.find((n) => n.tipo === tipo)!;
  // Mientras no se escriba un nombre, se usa el que corresponde al tipo elegido («Documento nuevo», «Hoja de cálculo nueva»…).
  const nombreFinal = nombre.trim() || t(info.nombre);

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    try {
      const final = await guardarArchivo(carpeta, await crearArchivoNuevo(tipo, nombreFinal, { lang: localeActual(), tituloDiapositiva: t("Haga clic para agregar título"), subtituloDiapositiva: t("Haga clic para agregar subtítulo") }));
      await onCreado(final);
      onCerrar();
      if (abrir) await abrirEnSistema(carpeta, final).catch(() => {});
    } catch (err) {
      setError(err instanceof ErrorCarpetas ? err.message : t("No se pudo crear el archivo."));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Dialog open onClose={onCerrar} title={t("Nuevo archivo")} maxWidth={480}>
      <form onSubmit={crear} className="flex flex-col gap-4">
        <div role="radiogroup" aria-label={t("Tipo de archivo")} className="grid grid-cols-2 gap-2">
          {NUEVOS.map((n) => (
            <button
              key={n.tipo}
              type="button"
              role="radio"
              aria-checked={n.tipo === tipo}
              onClick={() => setTipo(n.tipo)}
              className={clsx("rounded-control reveal flex items-center gap-3 border px-3 py-2.5 text-left transition-colors duration-exit ease-fluent", n.tipo === tipo ? "border-accent bg-layer-alt" : "border-stroke bg-layer hover:bg-layer-alt")}
            >
              <LogoPrograma programa={n.tipo} tam={36} />
              <span className="min-w-0">
                <span className="block truncate text-body font-semibold text-fg">{t(n.corto)}</span>
                <span className="block text-caption text-fg-secondary">{n.extension}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="-mt-2 text-caption text-fg-secondary">{t(info.descripcion)}</p>

        <TextInput
          label={t("Nombre")}
          value={nombre}
          placeholder={t(info.nombre)}
          maxLength={100}
          autoFocus
          autoComplete="off"
          error={error}
          onChange={(e) => {
            setNombre(e.target.value);
            setError(undefined);
          }}
        />
        <p className="-mt-2 break-words text-caption text-fg-tertiary">
          {t("Se guardará como «{archivo}» en {donde}", { archivo: nombreDeArchivoNuevo(tipo, nombreFinal), donde: ruta ? `${ruta}\\${carpeta}` : carpeta })}
        </p>

        <div className="flex items-center justify-between gap-3">
          <span className="text-body text-fg">{t("Abrirlo al crearlo")}</span>
          <Switch checked={abrir} onChange={setAbrir} label={t("Abrirlo al crearlo")} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onCerrar}>{t("Cancelar")}</Button>
          <Button type="submit" variant="accent" disabled={ocupado}>{t("Crear")}</Button>
        </div>
      </form>
    </Dialog>
  );
}
