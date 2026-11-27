"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownload20Regular, CheckmarkCircle16Filled, CheckmarkCircle20Filled, Clock20Regular, Dismiss16Regular, DismissCircle20Regular, ErrorCircle16Filled, ErrorCircle20Filled } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { IconButton } from "@/components/fluent/IconButton";
import { InfoBar } from "@/components/fluent/InfoBar";
import { ProgressBar } from "@/components/fluent/ProgressBar";
import { formatBytes } from "@/lib/documents/format";
import { getTool } from "@/lib/documents/tools";
import { traducir, useT } from "@/lib/i18n";
import { rutaHerramienta } from "@/lib/rutas";
import { cancelarCola, cancelarTrabajo } from "@/services/documents/controller";
import { descargar, mostrarDescarga, zipResults, type Descargado } from "@/services/documents/download";
import { estaPendiente, useColaStore, type Trabajo } from "@/store/cola-store";
import { useDocumentsStore } from "@/store/documents-store";
import { iconForMime, TOOL_ICONS } from "./toolIcons";

/** Guarda un resultado y anota en el trabajo dónde quedó (se sigue viendo aunque cambies de pantalla). */
async function guardar(idTrabajo: string, clave: string, blob: Blob, nombre: string) {
  try {
    const d = await descargar(blob, nombre);
    if (!d.cancelado) useColaStore.getState().anotarGuardado(idTrabajo, clave, d); // si cerró «Guardar como», no hay nada que avisar
  } catch (e) {
    useColaStore.getState().anotarGuardado(idTrabajo, clave, { error: e instanceof Error ? e.message : traducir("No se pudo guardar el archivo.") });
  }
}

/** La cola de conversiones: lo que se está haciendo, lo que espera y lo que ya está listo para descargar. */
export function ColaConversiones() {
  const t = useT();
  const trabajos = useColaStore((s) => s.trabajos);
  const [empaquetando, setEmpaquetando] = useState(false);
  const [zipDeTodo, setZipDeTodo] = useState<Descargado | { error: string } | undefined>(undefined);
  const ref = useRef<HTMLElement>(null);
  const antes = useRef(trabajos.length);

  // Al añadir un trabajo se trae la cola a la vista, aunque el diseño sea de una sola columna.
  useEffect(() => {
    if (trabajos.length > antes.current) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    antes.current = trabajos.length;
  }, [trabajos.length]);

  if (trabajos.length === 0) return null;

  const pendientes = trabajos.filter(estaPendiente);
  const listos = trabajos.filter((x) => x.estado === "listo" && x.resultados.length > 0);
  const esperando = trabajos.filter((x) => x.estado === "esperando");

  const descargarTodo = async () => {
    setEmpaquetando(true);
    try {
      const d = await descargar(await zipResults(listos.flatMap((x) => x.resultados)), "nexo-conversiones.zip");
      if (!d.cancelado) setZipDeTodo(d);
    } catch (e) {
      setZipDeTodo({ error: e instanceof Error ? e.message : t("No se pudo guardar el archivo.") });
    } finally {
      setEmpaquetando(false);
    }
  };

  return (
    <section ref={ref} aria-labelledby="cola-conversiones" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="cola-conversiones" className="text-body font-semibold text-fg">
          {t("Cola de conversiones")}
          {pendientes.length > 0 && <span className="ml-2 font-normal text-fg-secondary">{t("{n} por terminar", { n: pendientes.length })}</span>}
        </h2>
        <div className="flex gap-1">
          {pendientes.length > 1 && (
            <Button variant="subtle" className="h-7" onClick={cancelarCola}>
              {t("Cancelar todo")}
            </Button>
          )}
          {trabajos.length > pendientes.length && (
            <Button
              variant="subtle"
              className="h-7"
              onClick={() => {
                useColaStore.getState().quitarTerminados();
                setZipDeTodo(undefined);
              }}
            >
              {t("Quitar terminadas")}
            </Button>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {trabajos.map((trabajo) => (
          <li key={trabajo.id}>
            <Tarjeta trabajo={trabajo} puesto={esperando.indexOf(trabajo) + 1} />
          </li>
        ))}
      </ul>

      {listos.length > 1 && (
        <>
          <Button onClick={() => void descargarTodo()} disabled={empaquetando} icon={<ArrowDownload20Regular />} className="w-full">
            {empaquetando ? t("Preparando el ZIP…") : t("Descargar todo lo listo (ZIP)")}
          </Button>
          <Confirmacion estado={zipDeTodo} />
        </>
      )}
    </section>
  );
}

function Tarjeta({ trabajo, puesto }: { trabajo: Trabajo; puesto: number }) {
  const t = useT();
  const router = useRouter();
  const herramienta = getTool(trabajo.toolId);
  const nombre = t(herramienta.name);
  const [primero, ...resto] = trabajo.files;
  const archivos = resto.length === 0 ? (primero?.file.name ?? "") : t("{nombre} y {n} más", { nombre: primero!.file.name, n: resto.length });
  const terminado = !estaPendiente(trabajo);

  const volverAAbrir = () => {
    useDocumentsStore.getState().reabrir(trabajo);
    useColaStore.getState().quitar(trabajo.id);
    router.push(rutaHerramienta(trabajo.toolId));
  };

  const estado =
    trabajo.estado === "esperando"
      ? t("En espera · turno {n}", { n: puesto })
      : trabajo.estado === "procesando"
        ? `${Math.round(trabajo.progreso)} %`
        : trabajo.estado === "listo"
          ? t("Listo")
          : trabajo.estado === "error"
            ? t("No se pudo")
            : t("Cancelado");

  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex shrink-0 text-accent-text" aria-hidden>
          {TOOL_ICONS[trabajo.toolId]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-fg">{nombre}</p>
          <p className="truncate text-caption text-fg-secondary" title={trabajo.files.map((f) => f.file.name).join("\n")}>
            {archivos}
          </p>
        </div>
        <span className="tabular flex shrink-0 items-center gap-1 text-caption text-fg-secondary">
          {trabajo.estado === "listo" && <CheckmarkCircle20Filled className="text-success-fg" aria-hidden />}
          {trabajo.estado === "error" && <ErrorCircle20Filled className="text-danger-fg" aria-hidden />}
          {trabajo.estado === "esperando" && <Clock20Regular aria-hidden />}
          {trabajo.estado === "cancelado" && <DismissCircle20Regular aria-hidden />}
          {estado}
        </span>
        {terminado && (
          <IconButton label={t("Quitar de la cola: {nombre}", { nombre: archivos })} className="!h-7 !w-7 shrink-0" onClick={() => useColaStore.getState().quitar(trabajo.id)}>
            <Dismiss16Regular />
          </IconButton>
        )}
      </div>

      {trabajo.estado === "procesando" && (
        <>
          <ProgressBar value={trabajo.progreso} label={`${nombre}: ${Math.round(trabajo.progreso)}%`} />
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-caption text-fg-secondary" role="status" aria-live="polite" title={trabajo.mensaje}>
              {trabajo.mensaje || t("preparando")}
            </p>
            <Button className="h-7 shrink-0" onClick={() => cancelarTrabajo(trabajo.id)}>
              {t("Cancelar")}
            </Button>
          </div>
        </>
      )}

      {trabajo.estado === "esperando" && (
        <div className="flex justify-end">
          <Button variant="subtle" className="h-7" onClick={() => cancelarTrabajo(trabajo.id)}>
            {t("Sacar de la cola")}
          </Button>
        </div>
      )}

      {trabajo.estado === "listo" && <Resultados trabajo={trabajo} />}

      {trabajo.estado === "error" && trabajo.error && (
        <InfoBar severity="error" title={trabajo.error.message}>
          {trabajo.error.hint}
        </InfoBar>
      )}

      {(trabajo.estado === "error" || trabajo.estado === "cancelado") && (
        <div className="flex justify-end">
          <Button className="h-7" onClick={volverAAbrir}>
            {trabajo.estado === "error" ? t("Corregir y reintentar") : t("Volver a abrir")}
          </Button>
        </div>
      )}
    </Card>
  );
}

function Resultados({ trabajo }: { trabajo: Trabajo }) {
  const t = useT();
  const [empaquetando, setEmpaquetando] = useState(false);
  const { resultados } = trabajo;

  const zip = async () => {
    setEmpaquetando(true);
    try {
      await guardar(trabajo.id, "zip", await zipResults(resultados), `${t(getTool(trabajo.toolId).name)}.zip`);
    } finally {
      setEmpaquetando(false);
    }
  };

  return (
    <>
      <ul className="flex flex-col gap-2">
        {resultados.map((r) => (
          <li key={r.id} className="rounded-control flex flex-col gap-1.5 border border-stroke bg-layer px-2.5 py-2">
            <div className="flex items-center gap-2.5">
              <span className="flex shrink-0 text-accent-text" aria-hidden>
                {iconForMime(r.mime)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-fg" title={r.name}>
                  {r.name}
                </p>
                <p className="tabular text-caption text-fg-secondary">
                  {r.originalSize !== undefined ? (
                    <>
                      {formatBytes(r.originalSize)} → {formatBytes(r.size)}
                      {" · "}
                      <span className={r.savedPercent ? "font-semibold text-success-fg" : ""}>{r.savedPercent ? t("{n}% menos", { n: r.savedPercent }) : t("sin reducción posible")}</span>
                    </>
                  ) : (
                    formatBytes(r.size)
                  )}
                </p>
              </div>
              <Button
                variant={!trabajo.guardados[r.id] && resultados.length === 1 ? "accent" : "standard"}
                icon={<ArrowDownload20Regular />}
                onClick={() => void guardar(trabajo.id, r.id, r.blob, r.name)}
                aria-label={t("Descargar {nombre}", { nombre: r.name })}
                className="h-8 shrink-0"
              >
                {t("Descargar")}
              </Button>
            </div>
            <Confirmacion estado={trabajo.guardados[r.id]} />
          </li>
        ))}
      </ul>

      {trabajo.avisos.map((aviso) => (
        <InfoBar key={aviso} severity="warning" title={aviso} />
      ))}

      {resultados.length > 1 && (
        <>
          <Confirmacion estado={trabajo.guardados.zip} />
          <Button onClick={() => void zip()} disabled={empaquetando} icon={<ArrowDownload20Regular />} className="w-full">
            {empaquetando ? t("Preparando el ZIP…") : t("Descargar todo (ZIP)")}
          </Button>
        </>
      )}
    </>
  );
}

/** «✓ Guardado en Descargas como …» con acceso a la carpeta; o el motivo si no se pudo. */
function Confirmacion({ estado }: { estado: Descargado | { error: string } | undefined }) {
  const t = useT();
  if (!estado) return null;
  if ("error" in estado) {
    return (
      <p role="alert" className="flex items-start gap-1.5 text-caption text-danger-fg">
        <ErrorCircle16Filled className="mt-0.5 shrink-0" aria-hidden />
        {estado.error}
      </p>
    );
  }
  return (
    <p role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-success-fg">
      <span className="flex items-center gap-1.5 font-semibold">
        <CheckmarkCircle16Filled className="shrink-0" aria-hidden />
        {estado.ruta ? t("Guardado en «{carpeta}» como «{nombre}»", { carpeta: carpetaDe(estado.ruta), nombre: estado.nombre }) : t("Descarga iniciada: búscala en las descargas de tu navegador")}
      </span>
      {estado.ruta && (
        <button type="button" onClick={() => void mostrarDescarga(estado.ruta!).catch(() => {})} className="text-accent-text underline hover:no-underline">
          {t("Mostrar en la carpeta")}
        </button>
      )}
    </p>
  );
}

/** Nombre de la carpeta donde quedó un archivo («Descargas», «Redes»…). */
function carpetaDe(ruta: string): string {
  const partes = ruta.split(/[\\/]/);
  const carpeta = partes[partes.length - 2] ?? "";
  return carpeta === "Downloads" ? traducir("Descargas") : carpeta;
}
