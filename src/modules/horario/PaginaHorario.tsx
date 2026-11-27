"use client";

import { EstadoVacio } from "@/components/fluent/EstadoVacio";
import { useT, localeActual } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Glifo } from "@/components/fluent/Glifo";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { diaDeSemana, type Clase } from "@/lib/horario/horario";
import { useHorarioStore } from "@/store/horario-store";
import { DialogoClase, type BorradorClase } from "./DialogoClase";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { DialogoCarpetasHorario } from "../carpetas/DialogoCarpetasHorario";
import { DialogoCompartir } from "./DialogoCompartir";
import { DialogoEscaneo } from "./DialogoEscaneo";
import { DialogoNuevoSemestre } from "./DialogoNuevoSemestre";
import { DialogoSemestres } from "./DialogoSemestres";
import { RUTA_SEMESTRES } from "./PaginaSemestres";
import { RejillaSemana } from "./RejillaSemana";
import { useSemestresStore } from "@/store/semestres-store";

/** /horario — el horario semanal de clases, escaneado desde una imagen o escrito a mano. */
export function PaginaHorario() {
  const t = useT();
  const clases = useHorarioStore((s) => s.clases);
  const [escaneo, setEscaneo] = useState(false);
  const [compartir, setCompartir] = useState(false);
  const [dialogo, setDialogo] = useState(false);
  const [borrador, setBorrador] = useState<BorradorClase | null>(null);
  const [hoy] = useState(() => diaDeSemana(new Date()));
  const [materiasNuevas, setMateriasNuevas] = useState<string[] | null>(null);
  const escritorio = useEsEscritorio() === true;
  const semestre = useSemestresStore((x) => x.actual);
  const guardados = useSemestresStore((x) => x.anteriores.length);
  const [semestres, setSemestres] = useState(false);
  const [nuevoSemestre, setNuevoSemestre] = useState(false);

  useEffect(() => {
    useHorarioStore.getState().cargar();
    useSemestresStore.getState().cargar();
  }, []);

  // Desde el buscador global: «?clase=<id>» abre esa clase para verla o editarla.
  const router = useRouter();
  const idClase = useSearchParams().get("clase");
  useEffect(() => {
    if (!idClase) return;
    const c = clases.find((x) => x.id === idClase);
    if (!c) return; // aún no se cargan las clases: se reintenta cuando lleguen
    setBorrador(c);
    setDialogo(true);
    router.replace("/horario");
  }, [idClase, clases, router]);

  const abrir = (b: BorradorClase) => {
    setBorrador(b);
    setDialogo(true);
  };

  const materias = useMemo(() => {
    const mapa = new Map<string, Clase>();
    for (const c of clases) if (!mapa.has(c.materia)) mapa.set(c.materia, c);
    return [...mapa.values()].sort((a, b) => a.materia.localeCompare(b.materia, localeActual()));
  }, [clases]);

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Horario" }]}
        titulo={t("Horario")}
        descripcion={t("Tus clases de la semana. Escanea la imagen que te mandaron y se llena sola.")}
        accion={
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => abrir({ dia: Math.min(hoy, 4) })}>{t("Añadir clase")}</Button>
            <Button onClick={() => setCompartir(true)}>{t("Compartir")}</Button>
            <Button icon={<Glifo nombre="reloj" tam={14} />} onClick={() => router.push(RUTA_SEMESTRES)}>
              {guardados > 0 ? t("Anteriores ({n})", { n: guardados }) : t("Anteriores")}
            </Button>
            <Button icon={<Glifo nombre="calendario" tam={14} />} onClick={() => setSemestres(true)} title={t("Cambiar el nombre o empezar otro semestre")}>
              {semestre || t("Semestre")}
            </Button>
            <Button variant="accent" icon={<Glifo nombre="camara" />} onClick={() => setEscaneo(true)}>{t("Escanear imagen")}</Button>
          </div>
        }
        principal={
          clases.length === 0 ? (
            <EstadoVacio
              glifo="camara"
              titulo={t("Aún no tienes horario")}
              texto={t("Toma una foto de tu horario y Xook lo llena solo: saca las materias, los días y las horas.")}
              pasos={[t("Toma una captura o una foto del horario que te dieron."), t("Pulsa «Escanear imagen» y elígela."), t("Revisa las clases y guarda: Xook te avisará antes de cada una.")]}
              acciones={
                <>
                  <Button variant="accent" icon={<Glifo nombre="camara" />} onClick={() => setEscaneo(true)}>{t("Escanear imagen")}</Button>
                  <Button onClick={() => abrir({ dia: 0 })}>{t("Añadirlo a mano")}</Button>
                  {guardados > 0 && <Button icon={<Glifo nombre="reloj" tam={14} />} onClick={() => router.push(RUTA_SEMESTRES)}>{t("Ver semestres anteriores")}</Button>}
                </>
              }
            />
          ) : (
            <RejillaSemana clases={clases} hoy={hoy} onClase={abrir} etiqueta={t("Horario semanal")} />
          )
        }
        lateral={
          materias.length > 0 ? (
            <Card className="p-4">
              <h2 className="mb-3 text-body font-semibold text-fg">{t("Materias")}</h2>
              <ul className="flex flex-col gap-2">
                {materias.map((m) => (
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
          ) : undefined
        }
      />
      <DialogoSemestres
        abierto={semestres}
        onCerrar={() => setSemestres(false)}
        onNuevo={() => {
          setSemestres(false);
          setNuevoSemestre(true);
        }}
      />
      <DialogoNuevoSemestre
        abierto={nuevoSemestre}
        onCerrar={() => setNuevoSemestre(false)}
        onListo={(inicio) => {
          setNuevoSemestre(false);
          if (inicio === "escanear") setEscaneo(true);
          else if (inicio === "importar") setCompartir(true);
        }}
      />
      <DialogoCompartir abierto={compartir} alCerrar={() => setCompartir(false)} />
      <DialogoEscaneo
        abierto={escaneo}
        onCerrar={() => setEscaneo(false)}
        // Solo en la aplicación de escritorio (las carpetas son de tu computadora): se pregunta, nunca se crea solo.
        onGuardado={(materias) => escritorio && setMateriasNuevas(materias)}
      />
      <DialogoCarpetasHorario abierto={materiasNuevas !== null} materias={materiasNuevas ?? []} onCerrar={() => setMateriasNuevas(null)} />
      <DialogoClase abierto={dialogo} inicial={borrador} onCerrar={() => setDialogo(false)} />
    </>
  );
}
