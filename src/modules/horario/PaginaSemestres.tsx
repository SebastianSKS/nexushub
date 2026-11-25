"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Dialog } from "@/components/fluent/Dialog";
import { EstadoVacio } from "@/components/fluent/EstadoVacio";
import { Glifo } from "@/components/fluent/Glifo";
import { InfoBar } from "@/components/fluent/InfoBar";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { localeActual, useT } from "@/lib/i18n";
import { aMinutos, nombreDiaSemana, type Clase } from "@/lib/horario/horario";
import { horasPorSemana, materiasDe, type Semestre } from "@/lib/horario/semestres";
import { abrirEnSistema, CARPETA_ANTERIORES, carpetasArchivadas, carpetasDisponibles, nombreCarpetaDe, type Carpeta } from "@/services/carpetas";
import { useHorarioStore } from "@/store/horario-store";
import { useSemestresStore } from "@/store/semestres-store";
import { DialogoRecuperar } from "./DialogoRecuperar";
import { carriles, limitesDeSemana, RejillaSemana } from "./RejillaSemana";

export const RUTA_SEMESTRES = "/horario/anteriores";

/** Las carpetas archivadas de cada semestre guardado, por id. Solo en la aplicación de escritorio. */
function useCarpetasGuardadas(semestres: Semestre[]) {
  const [porId, setPorId] = useState<Record<string, Carpeta[]>>({});
  useEffect(() => {
    if (!carpetasDisponibles() || semestres.length === 0) return;
    let cancelado = false;
    Promise.all(semestres.map(async (s) => [s.id, await carpetasArchivadas(s.nombre).catch(() => [])] as const)).then((pares) => !cancelado && setPorId(Object.fromEntries(pares)));
    return () => {
      cancelado = true;
    };
  }, [semestres]);
  return porId;
}

/** /horario/anteriores — los semestres guardados, para verlos y recuperarlos. Con «?id=» muestra uno completo. */
export function PaginaSemestres() {
  const t = useT();
  const router = useRouter();
  const elegido = useSearchParams().get("id");
  const anteriores = useSemestresStore((s) => s.anteriores);
  const cargado = useSemestresStore((s) => s.cargado);
  const guardadas = useCarpetasGuardadas(anteriores);
  const [recuperar, setRecuperar] = useState<Semestre | null>(null);
  const [borrar, setBorrar] = useState<Semestre | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    useHorarioStore.getState().cargar();
    useSemestresStore.getState().cargar();
  }, []);

  const abrirCarpetas = useCallback(
    async (nombre?: string) => {
      setAviso(null);
      try {
        await abrirEnSistema(CARPETA_ANTERIORES, nombre ? nombreCarpetaDe(nombre) : undefined);
      } catch {
        setAviso(t("Todavía no has archivado ninguna carpeta."));
      }
    },
    [t],
  );

  const semestre = elegido ? (anteriores.find((s) => s.id === elegido) ?? null) : null;

  const dialogos = (
    <>
      <DialogoRecuperar semestre={recuperar} guardadas={recuperar ? (guardadas[recuperar.id] ?? []) : []} onCerrar={() => setRecuperar(null)} onHecho={() => router.push("/horario")} />
      <Dialog open={borrar !== null} onClose={() => setBorrar(null)} title={t("Borrar «{nombre}»", { nombre: borrar?.nombre ?? "" })} maxWidth={460}>
        <div className="flex flex-col gap-4">
          <p className="text-body text-fg-secondary">{t("Se borra este horario guardado y no se puede deshacer. Sus carpetas no se tocan.")}</p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setBorrar(null)}>{t("Cancelar")}</Button>
            <Button
              variant="accent"
              onClick={() => {
                if (borrar) useSemestresStore.getState().borrar(borrar.id);
                setBorrar(null);
                if (elegido) router.replace(RUTA_SEMESTRES);
              }}
            >
              {t("Sí, borrar")}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );

  if (semestre) {
    return (
      <>
        <PlantillaPagina
          migas={[{ etiqueta: "Horario", href: "/horario" }, { etiqueta: "Semestres anteriores", href: RUTA_SEMESTRES }, { etiqueta: semestre.nombre }]}
          titulo={semestre.nombre}
          descripcion={resumen(t, semestre, guardadas[semestre.id])}
          accion={
            <div className="flex flex-wrap gap-2">
              <Button variant="subtle" onClick={() => setBorrar(semestre)}>
                {t("Borrar")}
              </Button>
              <Button variant="accent" icon={<Glifo nombre="actualizar" tam={14} />} onClick={() => setRecuperar(semestre)}>
                {t("Recuperar este semestre")}
              </Button>
            </div>
          }
          principal={<RejillaSemana clases={semestre.clases} etiqueta={t("Horario de {nombre}", { nombre: semestre.nombre })} />}
          lateral={
            <>
              <Card className="p-4">
                <h2 className="mb-3 text-body font-semibold text-fg">{t("Materias")}</h2>
                <ul className="flex flex-col gap-2">
                  {materiasDe(semestre.clases).map((m) => (
                    <li key={m.materia} className="flex items-start gap-2.5">
                      <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="min-w-0">
                        <span className="block text-body text-fg">{m.materia}</span>
                        <span className="block text-caption text-fg-secondary">{[m.codigo, m.docente].filter(Boolean).join(" · ") || t("Sin docente")}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              {(guardadas[semestre.id]?.length ?? 0) > 0 && (
                <Card className="p-4">
                  <h2 className="mb-3 text-body font-semibold text-fg">{t("Carpetas guardadas")}</h2>
                  <ul className="mb-3 flex flex-col gap-1.5">
                    {guardadas[semestre.id]!.map((c) => (
                      <li key={c.nombre} className="flex items-center gap-2 text-body text-fg">
                        <Glifo nombre="carpeta" tam={14} className="text-fg-secondary" />
                        <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
                        <span className="shrink-0 text-caption text-fg-tertiary">{t("Archivos: {n}", { n: c.archivos })}</span>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={() => void abrirCarpetas(semestre.nombre)}>{t("Abrir en el Explorador")}</Button>
                </Card>
              )}
              {aviso && <InfoBar severity="info" title={aviso} />}
            </>
          }
        />
        {dialogos}
      </>
    );
  }

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Horario", href: "/horario" }, { etiqueta: "Semestres anteriores" }]}
        titulo={t("Semestres anteriores")}
        descripcion={t("Tus horarios guardados. Ábrelos para verlos completos o recupera el que quieras.")}
        accion={carpetasDisponibles() && anteriores.length > 0 ? <Button icon={<Glifo nombre="carpeta" tam={14} />} onClick={() => void abrirCarpetas()}>{t("Abrir las carpetas archivadas")}</Button> : undefined}
        principal={
          !cargado ? null : anteriores.length === 0 ? (
            <EstadoVacio
              glifo="calendario"
              titulo={t("Aún no hay semestres anteriores")}
              texto={t("Cuando empieces uno nuevo, el de ahora quedará guardado aquí.")}
              acciones={
                <Button variant="accent" onClick={() => router.push("/horario")}>
                  {t("Ir a mi horario")}
                </Button>
              }
            />
          ) : (
            <>
              {aviso && <InfoBar severity="info" title={aviso} />}
              <ul className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))" }}>
                {anteriores.map((s) => (
                  <li key={s.id} className="flex">
                    <Tarjeta semestre={s} carpetas={guardadas[s.id]} onVer={() => router.push(`${RUTA_SEMESTRES}?id=${encodeURIComponent(s.id)}`)} onRecuperar={() => setRecuperar(s)} onBorrar={() => setBorrar(s)} />
                  </li>
                ))}
              </ul>
            </>
          )
        }
      />
      {dialogos}
    </>
  );
}

/** «Materias: 7 · 18 h a la semana · Guardado el 25 nov 2026». */
function resumen(t: ReturnType<typeof useT>, semestre: Semestre, carpetas?: Carpeta[]): string {
  const partes = [
    t("Materias: {n}", { n: materiasDe(semestre.clases).length }),
    t("{h} h a la semana", { h: horasPorSemana(semestre.clases).toLocaleString(localeActual(), { maximumFractionDigits: 1 }) }),
    carpetas?.length ? t("Carpetas: {n}", { n: carpetas.length }) : "",
    semestre.terminado > 0 ? t("Guardado el {fecha}", { fecha: new Date(semestre.terminado).toLocaleDateString(localeActual(), { day: "numeric", month: "short", year: "numeric" }) }) : "",
  ];
  return partes.filter(Boolean).join(" · ");
}

function Tarjeta({ semestre, carpetas, onVer, onRecuperar, onBorrar }: { semestre: Semestre; carpetas?: Carpeta[]; onVer: () => void; onRecuperar: () => void; onBorrar: () => void }) {
  const t = useT();
  const materias = materiasDe(semestre.clases);
  return (
    <Card className="flex w-full flex-col gap-3 p-4">
      <div>
        <h2 className="text-subtitle text-fg">{semestre.nombre}</h2>
        <p className="mt-0.5 text-caption text-fg-secondary">
          {resumen(t, semestre, carpetas)}
        </p>
      </div>
      {/* La semana en pequeño abre el horario completo; el botón «Ver» hace lo mismo con teclado. */}
      <button type="button" tabIndex={-1} aria-hidden onClick={onVer} className="rounded-input border border-stroke bg-layer-alt/60 p-2 transition-[filter] duration-exit hover:brightness-110">
        <MiniSemana clases={semestre.clases} />
      </button>
      <ul className="flex flex-wrap gap-1.5">
        {materias.map((m) => (
          <li key={m.materia} className="flex max-w-full items-center gap-1.5 rounded-full border border-stroke px-2.5 py-0.5 text-caption text-fg-secondary">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="truncate">{m.materia}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-stroke pt-3">
        <Button variant="accent" icon={<Glifo nombre="actualizar" tam={14} />} onClick={onRecuperar}>
          {t("Recuperar")}
        </Button>
        <Button onClick={onVer}>{t("Ver horario")}</Button>
        <Button variant="subtle" className="ml-auto" aria-label={t("Borrar «{nombre}»", { nombre: semestre.nombre })} title={t("Borrar")} onClick={onBorrar}>
          <Glifo nombre="eliminar" tam={14} />
        </Button>
      </div>
    </Card>
  );
}

const DIA_CORTO = 3;

/** La semana como un dibujo: una columna por día y un bloque de color por clase. */
function MiniSemana({ clases }: { clases: Clase[] }) {
  const { dias, desde, hasta } = limitesDeSemana(clases);
  const total = Math.max(60, hasta - desde);
  return (
    <span className="grid gap-1" style={{ gridTemplateColumns: `repeat(${dias}, minmax(0, 1fr))` }}>
      {Array.from({ length: dias }, (_, dia) => (
        <span key={dia} className="flex flex-col gap-1">
          <span className="block text-center text-caption text-fg-tertiary">{nombreDiaSemana(dia).slice(0, DIA_CORTO)}</span>
          <span className="relative block h-24">
            {carriles(clases.filter((c) => c.dia === dia)).map(({ clase, carril, de }) => (
              <span
                key={clase.id}
                className="absolute block rounded-[3px]"
                style={{
                  top: `${((aMinutos(clase.inicio) - desde) / total) * 100}%`,
                  height: `calc(${((aMinutos(clase.fin) - aMinutos(clase.inicio)) / total) * 100}% - 2px)`,
                  left: `${(carril / de) * 100}%`,
                  width: `${100 / de}%`,
                  backgroundColor: clase.color,
                }}
              />
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
