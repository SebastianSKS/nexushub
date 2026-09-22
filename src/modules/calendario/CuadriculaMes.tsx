"use client";

import clsx from "clsx";
import { Glifo } from "@/components/fluent/Glifo";
import { claveFecha, cumpleEn, DIAS_CORTOS, diasDelMes, fechaLarga, inicioDelDia, MESES, mayuscula } from "@/lib/calendario/fechas";
import type { Amigo, Evento } from "@/store/calendario-store";

interface Props {
  anio: number;
  mes: number;
  amigos: Amigo[];
  eventos: Evento[];
  onMes: (delta: -1 | 1) => void;
  onHoy: () => void;
  onDia: (fecha: Date) => void;
  onAmigo: (a: Amigo) => void;
  onEvento: (e: Evento) => void;
}

/** Un cumpleaños y un evento se dibujan igual en la cuadrícula: una etiqueta con su color. */
interface Etiqueta {
  clave: string;
  nombre: string;
  color: string;
  onAbrir: () => void;
}

const MAX_CHIPS = 2;

/** Texto blanco u oscuro según el brillo del color de fondo, para que siempre se lea. */
function textoSobre(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? "#1b1b1b" : "#ffffff";
}

/** Relleno del día: el color del amigo; con varios amigos, franjas con cada uno de sus colores. */
function rellenoDia(colores: string[]): string | undefined {
  if (colores.length === 0) return undefined;
  const tinte = (c: string) => `color-mix(in srgb, ${c} 42%, transparent)`;
  if (colores.length === 1) return `linear-gradient(${tinte(colores[0]!)}, ${tinte(colores[0]!)})`;
  const paso = 100 / colores.length;
  return `linear-gradient(135deg, ${colores.map((c, i) => `${tinte(c)} ${i * paso}%, ${tinte(c)} ${(i + 1) * paso}%`).join(", ")})`;
}

/** Calendario del mes (semanas de lunes a domingo). Cada cumpleaños y cada evento es una etiqueta con su color. */
export function CuadriculaMes({ anio, mes, amigos, eventos, onMes, onHoy, onDia, onAmigo, onEvento }: Props) {
  const hoy = inicioDelDia(new Date());
  const dias = diasDelMes(anio, mes);
  const esteMes = hoy.getFullYear() === anio && hoy.getMonth() + 1 === mes;

  return (
    <section aria-label={`Calendario de ${MESES[mes - 1]} de ${anio}`} className="overflow-hidden rounded-[8px] border border-stroke bg-layer shadow-card">
      <header className="flex items-center gap-2 px-4 py-3" style={{ backgroundImage: "linear-gradient(135deg, #0f6cbd 0%, #2b88d8 60%, #4aa8ee 100%)" }}>
        <h2 className="flex-1 text-subtitle text-white" aria-live="polite">
          {mayuscula(MESES[mes - 1]!)} <span className="font-normal opacity-80">{anio}</span>
        </h2>
        <button type="button" onClick={onHoy} disabled={esteMes} className="rounded-control h-8 px-3 text-body text-white transition-colors duration-exit ease-fluent hover:bg-white/15 disabled:opacity-50 disabled:hover:bg-transparent">
          Hoy
        </button>
        <button type="button" onClick={() => onMes(-1)} aria-label="Mes anterior" title="Mes anterior" className="rounded-control flex h-8 w-8 items-center justify-center text-white transition-colors duration-exit ease-fluent hover:bg-white/15">
          <Glifo nombre="chevronIzquierda" tam={14} />
        </button>
        <button type="button" onClick={() => onMes(1)} aria-label="Mes siguiente" title="Mes siguiente" className="rounded-control flex h-8 w-8 items-center justify-center text-white transition-colors duration-exit ease-fluent hover:bg-white/15">
          <Glifo nombre="chevronDerecha" tam={14} />
        </button>
      </header>

      <div className="grid grid-cols-7 border-b border-stroke" aria-hidden>
        {DIAS_CORTOS.map((d) => (
          <div key={d} className="py-2 text-center text-caption font-semibold text-fg-secondary">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dias.map(({ fecha, delMes }, i) => {
          const esHoy = fecha.getTime() === hoy.getTime();
          const cumples = amigos.filter((a) => cumpleEn(a, fecha)).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
          const eventosDia = eventos.filter((e) => e.fecha === claveFecha(fecha)).sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
          const etiquetas: Etiqueta[] = [
            ...cumples.map((a): Etiqueta => ({ clave: `a-${a.id}`, nombre: a.nombre, color: a.color, onAbrir: () => onAmigo(a) })),
            ...eventosDia.map((e): Etiqueta => ({ clave: `e-${e.id}`, nombre: e.titulo, color: e.color, onAbrir: () => onEvento(e) })),
          ];
          const resumen = [cumples.length ? `cumple ${cumples.map((c) => c.nombre).join(", ")}` : "", eventosDia.length ? eventosDia.map((e) => e.titulo).join(", ") : ""]
            .filter(Boolean)
            .join("; ");
          return (
            <div
              key={i}
              className={clsx("relative min-h-[76px] border-b border-r border-stroke p-1.5", i % 7 === 6 && "border-r-0", i >= 35 && "border-b-0", !delMes && etiquetas.length === 0 && "bg-layer/40")}
              style={{ backgroundImage: rellenoDia(etiquetas.map((e) => e.color)), opacity: !delMes && etiquetas.length > 0 ? 0.6 : undefined }}
            >
              <button
                type="button"
                onClick={() => onDia(fecha)}
                aria-label={`${fechaLarga(fecha)}${resumen ? `, ${resumen}` : ""}. Añadir cumpleaños`}
                aria-current={esHoy ? "date" : undefined}
                className="rounded-control absolute inset-0 transition-colors duration-exit ease-fluent hover:bg-layer-alt focus-visible:z-10"
              />
              <span
                aria-hidden
                className={clsx(
                  "pointer-events-none relative mb-1 flex h-6 w-6 items-center justify-center rounded-full text-caption",
                  esHoy ? "bg-accent font-semibold text-accent-on" : delMes ? "text-fg" : "text-fg-tertiary",
                )}
              >
                {fecha.getDate()}
              </span>
              <ul className="pointer-events-none relative flex flex-col gap-0.5">
                {etiquetas.slice(0, MAX_CHIPS).map((e) => (
                  <li key={e.clave} className="pointer-events-auto">
                    <button
                      type="button"
                      onClick={e.onAbrir}
                      title={e.nombre}
                      aria-label={`Editar «${e.nombre}»`}
                      className="block w-full truncate rounded-[4px] px-1.5 py-0.5 text-left text-caption font-semibold shadow-card transition-[filter] duration-exit hover:brightness-110"
                      style={{ backgroundColor: e.color, color: textoSobre(e.color) }}
                    >
                      {e.nombre}
                    </button>
                  </li>
                ))}
                {etiquetas.length > MAX_CHIPS && (
                  <li className="pointer-events-auto">
                    <button type="button" onClick={etiquetas[MAX_CHIPS]!.onAbrir} className="w-full rounded-[4px] px-1.5 text-left text-caption text-fg-secondary hover:bg-layer-alt" aria-label={`Ver ${etiquetas.length - MAX_CHIPS} más`}>
                      +{etiquetas.length - MAX_CHIPS} más
                    </button>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
