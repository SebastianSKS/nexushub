"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { useHora } from "@/hooks/useHora";
import { useT } from "@/lib/i18n";
import { aMinutos, colorDeTexto, nombreDiaSemana, type Clase } from "@/lib/horario/horario";
import { useAjustesStore } from "@/store/ajustes-store";

const PX_POR_MINUTO = 1.15;

/** Reparte las clases de un día que se pisan en «carriles» para dibujarlas una junto a otra. */
export function carriles(clases: Clase[]): { clase: Clase; carril: number; de: number }[] {
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

/** Qué días y de qué hora a qué hora hay que dibujar: de lunes a viernes como mínimo, a horas en punto. */
export function limitesDeSemana(clases: Clase[]): { dias: number; desde: number; hasta: number } {
  const dias = Math.max(4, ...clases.map((c) => c.dia)) + 1;
  const desde = clases.length ? Math.floor(Math.min(...clases.map((c) => aMinutos(c.inicio))) / 60) * 60 : 7 * 60;
  const hasta = clases.length ? Math.ceil(Math.max(...clases.map((c) => aMinutos(c.fin))) / 60) * 60 : 15 * 60;
  return { dias, desde, hasta };
}

/** La semana dibujada por horas. Con `onClase` cada clase se puede pulsar; sin él es solo para ver. */
export function RejillaSemana({ clases, hoy = null, onClase, etiqueta }: { clases: Clase[]; hoy?: number | null; onClase?: (c: Clase) => void; etiqueta: string }) {
  const t = useT();
  const { hora, enPunto } = useHora();
  const anchoRiel = useAjustesStore((s) => s.formatoHora) === "12h" ? 84 : 56;
  const { dias, desde, hasta } = useMemo(() => limitesDeSemana(clases), [clases]);
  const alto = (hasta - desde) * PX_POR_MINUTO;
  const horas = Array.from({ length: (hasta - desde) / 60 + 1 }, (_, i) => desde + i * 60);
  const columnas = { gridTemplateColumns: `${anchoRiel}px repeat(${dias}, minmax(0, 1fr))` };

  return (
    <section aria-label={etiqueta} className="overflow-x-auto rounded-[8px] border border-stroke bg-layer shadow-card">
      <div className="min-w-[520px]">
        <div className="grid border-b border-stroke" style={columnas}>
          <div />
          {Array.from({ length: dias }, (_, i) => (
            <div key={i} className={clsx("py-2.5 text-center text-body font-semibold", i === hoy ? "text-accent-text" : "text-fg")}>{nombreDiaSemana(i)}</div>
          ))}
        </div>
        <div className="grid" style={columnas}>
          <div className="relative" style={{ height: alto }} aria-hidden>
            {horas.slice(0, -1).map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-caption text-fg-tertiary" style={{ top: (h - desde) * PX_POR_MINUTO + 10 }}>
                {enPunto(h / 60)}
              </span>
            ))}
          </div>
          {Array.from({ length: dias }, (_, dia) => (
            <div
              key={dia}
              className={clsx("relative border-l border-stroke", dia === hoy && "bg-layer-alt/60")}
              style={{ height: alto, backgroundImage: "linear-gradient(to bottom, var(--stroke) 1px, transparent 1px)", backgroundSize: `100% ${60 * PX_POR_MINUTO}px` }}
            >
              {carriles(clases.filter((c) => c.dia === dia)).map(({ clase, carril, de }) => {
                const top = (aMinutos(clase.inicio) - desde) * PX_POR_MINUTO;
                const altura = (aMinutos(clase.fin) - aMinutos(clase.inicio)) * PX_POR_MINUTO;
                const detalle = `${clase.materia}${clase.codigo ? ` (${clase.codigo})` : ""}\n${hora(clase.inicio)} – ${hora(clase.fin)}${clase.docente ? `\n${clase.docente}` : ""}${clase.aula ? `\n${t("Aula {aula}", { aula: clase.aula })}` : ""}`;
                const estilo = { top: top + 1, height: altura - 2, left: `calc(${(carril / de) * 100}% + 2px)`, width: `calc(${100 / de}% - 4px)`, backgroundColor: clase.color, color: colorDeTexto(clase.color) };
                const clasesBloque = "absolute overflow-hidden rounded-[4px] px-1.5 py-1 text-left shadow-card";
                const contenido = (
                  <>
                    <span className="block text-caption font-semibold leading-tight">{clase.materia}</span>
                    {altura > 46 && <span className="mt-0.5 block text-caption leading-tight opacity-90">{hora(clase.inicio)} – {hora(clase.fin)}</span>}
                    {altura > 78 && clase.docente && <span className="mt-0.5 block text-caption leading-tight opacity-90">{clase.docente}</span>}
                  </>
                );
                return onClase ? (
                  <button
                    key={clase.id}
                    type="button"
                    onClick={() => onClase(clase)}
                    aria-label={t("Editar {materia}, {dia} de {inicio} a {fin}", { materia: clase.materia, dia: nombreDiaSemana(clase.dia), inicio: hora(clase.inicio), fin: hora(clase.fin) })}
                    title={detalle}
                    className={clsx(clasesBloque, "transition-[filter] duration-exit hover:brightness-110")}
                    style={estilo}
                  >
                    {contenido}
                  </button>
                ) : (
                  <div key={clase.id} title={detalle} className={clasesBloque} style={estilo}>
                    {contenido}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
