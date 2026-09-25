"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Glifo } from "@/components/fluent/Glifo";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { DIAS, aMinutos, colorDeTexto, diaDeSemana, type Clase } from "@/lib/horario/horario";
import { useHorarioStore } from "@/store/horario-store";
import { DialogoClase, type BorradorClase } from "./DialogoClase";
import { useEsEscritorio } from "@/hooks/useEsEscritorio";
import { DialogoCarpetasHorario } from "../carpetas/DialogoCarpetasHorario";
import { DialogoEscaneo } from "./DialogoEscaneo";

const PX_POR_MINUTO = 1.15;

/** Reparte las clases de un día que se pisan en «carriles» para dibujarlas una junto a otra. */
function carriles(clases: Clase[]): { clase: Clase; carril: number; de: number }[] {
  const orden = [...clases].sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio) || aMinutos(b.fin) - aMinutos(a.fin));
  const colocadas: { clase: Clase; carril: number; grupo: number }[] = [];
  const finCarril: number[] = [];
  let grupo = 0;
  let finGrupo = -1;
  for (const c of orden) {
    const ini = aMinutos(c.inicio);
    if (ini >= finGrupo) {
      finCarril.length = 0;
      grupo++;
    }
    let k = finCarril.findIndex((f) => f <= ini);
    if (k < 0) k = finCarril.length;
    finCarril[k] = aMinutos(c.fin);
    finGrupo = Math.max(finGrupo, aMinutos(c.fin));
    colocadas.push({ clase: c, carril: k, grupo });
  }
  return colocadas.map((x) => ({ clase: x.clase, carril: x.carril, de: Math.max(...colocadas.filter((o) => o.grupo === x.grupo).map((o) => o.carril)) + 1 }));
}

/** /horario — el horario semanal de clases, escaneado desde una imagen o escrito a mano. */
export function PaginaHorario() {
  const clases = useHorarioStore((s) => s.clases);
  const [escaneo, setEscaneo] = useState(false);
  const [dialogo, setDialogo] = useState(false);
  const [borrador, setBorrador] = useState<BorradorClase | null>(null);
  const [hoy] = useState(() => diaDeSemana(new Date()));
  const [materiasNuevas, setMateriasNuevas] = useState<string[] | null>(null);
  const escritorio = useEsEscritorio() === true;

  useEffect(() => useHorarioStore.getState().cargar(), []);

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

  const { diasVisibles, minIni, minFin } = useMemo(() => {
    const ultimo = Math.max(4, ...clases.map((c) => c.dia));
    const ini = clases.length ? Math.floor(Math.min(...clases.map((c) => aMinutos(c.inicio))) / 60) * 60 : 7 * 60;
    const fin = clases.length ? Math.ceil(Math.max(...clases.map((c) => aMinutos(c.fin))) / 60) * 60 : 15 * 60;
    return { diasVisibles: ultimo + 1, minIni: ini, minFin: fin };
  }, [clases]);

  const materias = useMemo(() => {
    const mapa = new Map<string, Clase>();
    for (const c of clases) if (!mapa.has(c.materia)) mapa.set(c.materia, c);
    return [...mapa.values()].sort((a, b) => a.materia.localeCompare(b.materia, "es"));
  }, [clases]);

  const alto = (minFin - minIni) * PX_POR_MINUTO;
  const horas = Array.from({ length: (minFin - minIni) / 60 + 1 }, (_, i) => minIni + i * 60);

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Horario" }]}
        titulo="Horario"
        descripcion="Tus clases de la semana. Escanea la imagen que te mandaron y se llena sola."
        accion={
          <div className="flex gap-2">
            <Button onClick={() => abrir({ dia: Math.min(hoy, 4) })}>Añadir clase</Button>
            {escritorio && <Link href="/documentos/carpetas" className="rounded-control inline-flex h-8 items-center gap-2 border border-stroke bg-layer-alt px-4 text-body text-fg shadow-card transition-colors duration-exit ease-fluent hover:bg-layer"><Glifo nombre="carpeta" tam={14} />Mis tareas</Link>}
            <Button variant="accent" icon={<Glifo nombre="camara" />} onClick={() => setEscaneo(true)}>Escanear imagen</Button>
          </div>
        }
        principal={
          clases.length === 0 ? (
            <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
              <Glifo nombre="camara" tam={36} className="text-accent-text" />
              <div>
                <p className="text-subtitle text-fg">Aún no tienes horario</p>
                <p className="mx-auto mt-1 max-w-[440px] text-body text-fg-secondary">Sube la imagen del horario que te dieron (una captura o una foto) y Nexo saca las materias, los días y las horas. Después puedes corregir lo que haga falta.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="accent" icon={<Glifo nombre="camara" />} onClick={() => setEscaneo(true)}>Escanear imagen</Button>
                <Button onClick={() => abrir({ dia: 0 })}>Añadirlo a mano</Button>
              </div>
            </Card>
          ) : (
            <section aria-label="Horario semanal" className="overflow-x-auto rounded-[8px] border border-stroke bg-layer shadow-card">
              <div className="min-w-[640px]">
                <div className="grid border-b border-stroke" style={{ gridTemplateColumns: `56px repeat(${diasVisibles}, minmax(0, 1fr))` }}>
                  <div />
                  {DIAS.slice(0, diasVisibles).map((d, i) => (
                    <div key={d} className={clsx("py-2.5 text-center text-body font-semibold", i === hoy ? "text-accent-text" : "text-fg")}>{d}</div>
                  ))}
                </div>
                <div className="grid" style={{ gridTemplateColumns: `56px repeat(${diasVisibles}, minmax(0, 1fr))` }}>
                  <div className="relative" style={{ height: alto }} aria-hidden>
                    {horas.slice(0, -1).map((h) => (
                      <span key={h} className="absolute right-2 -translate-y-1/2 text-caption text-fg-tertiary" style={{ top: (h - minIni) * PX_POR_MINUTO + 10 }}>
                        {String(h / 60).padStart(2, "0")}:00
                      </span>
                    ))}
                  </div>
                  {Array.from({ length: diasVisibles }, (_, dia) => (
                    <div
                      key={dia}
                      className={clsx("relative border-l border-stroke", dia === hoy && "bg-layer-alt/60")}
                      style={{ height: alto, backgroundImage: "linear-gradient(to bottom, var(--stroke) 1px, transparent 1px)", backgroundSize: `100% ${60 * PX_POR_MINUTO}px` }}
                    >
                      {carriles(clases.filter((c) => c.dia === dia)).map(({ clase, carril, de }) => {
                        const top = (aMinutos(clase.inicio) - minIni) * PX_POR_MINUTO;
                        const altura = (aMinutos(clase.fin) - aMinutos(clase.inicio)) * PX_POR_MINUTO;
                        return (
                          <button
                            key={clase.id}
                            type="button"
                            onClick={() => abrir(clase)}
                            aria-label={`Editar ${clase.materia}, ${DIAS[clase.dia]} de ${clase.inicio} a ${clase.fin}`}
                            title={`${clase.materia}${clase.codigo ? ` (${clase.codigo})` : ""}\n${clase.inicio} – ${clase.fin}${clase.docente ? `\n${clase.docente}` : ""}${clase.aula ? `\nAula ${clase.aula}` : ""}`}
                            className="absolute overflow-hidden rounded-[4px] px-1.5 py-1 text-left shadow-card transition-[filter] duration-exit hover:brightness-110"
                            style={{ top: top + 1, height: altura - 2, left: `calc(${(carril / de) * 100}% + 2px)`, width: `calc(${100 / de}% - 4px)`, backgroundColor: clase.color, color: colorDeTexto(clase.color) }}
                          >
                            <span className="block text-caption font-semibold leading-tight">{clase.materia}</span>
                            {altura > 46 && <span className="mt-0.5 block text-caption leading-tight opacity-90">{clase.inicio} – {clase.fin}</span>}
                            {altura > 78 && clase.docente && <span className="mt-0.5 block text-caption leading-tight opacity-90">{clase.docente}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        }
        lateral={
          materias.length > 0 ? (
            <Card className="p-4">
              <h2 className="mb-3 text-body font-semibold text-fg">Materias</h2>
              <ul className="flex flex-col gap-2">
                {materias.map((m) => (
                  <li key={m.materia} className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="min-w-0">
                      <span className="block text-body text-fg">{m.materia}</span>
                      <span className="block text-caption text-fg-secondary">{[m.codigo, m.docente].filter(Boolean).join(" · ") || "Sin docente"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : undefined
        }
      />
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
