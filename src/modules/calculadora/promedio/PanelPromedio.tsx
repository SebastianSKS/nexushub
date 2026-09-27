"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/fluent/Button";
import { EstadoVacio } from "@/components/fluent/EstadoVacio";
import { Glifo } from "@/components/fluent/Glifo";
import { useT } from "@/lib/i18n";
import { MAX_MATERIAS } from "@/lib/promedio";
import { useHorarioStore } from "@/store/horario-store";
import { usePromedioStore } from "@/store/promedio-store";
import { ResumenPromedio } from "./ResumenPromedio";
import { TarjetaMateria } from "./TarjetaMateria";

/** Las materias del horario que todavía no están en el promedio (sin repetir, sin importar mayúsculas). */
function materiasDelHorarioQueFaltan(clases: readonly { materia: string }[], existentes: readonly { nombre: string }[]): string[] {
  const ya = new Set(existentes.map((m) => m.nombre.trim().toLowerCase()));
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const c of clases) {
    const nombre = c.materia.trim();
    const clave = nombre.toLowerCase();
    if (!nombre || ya.has(clave) || vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push(nombre);
  }
  return salida;
}

/** «Promedio»: tus materias con sus evaluaciones, para saber cómo vas y cuánto necesitas sacar en lo que falta. */
export function PanelPromedio() {
  const t = useT();
  const cargar = usePromedioStore((s) => s.cargar);
  const materias = usePromedioStore((s) => s.materias);
  const escala = usePromedioStore((s) => s.escala);
  const agregarMateria = usePromedioStore((s) => s.agregarMateria);
  const clases = useHorarioStore((s) => s.clases);
  const cargarHorario = useHorarioStore((s) => s.cargar);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    cargar();
    cargarHorario();
  }, [cargar, cargarHorario]);

  const faltan = useMemo(() => materiasDelHorarioQueFaltan(clases, materias), [clases, materias]);
  const nombresEvaluaciones = [t("Parcial 1"), t("Parcial 2"), t("Tareas"), t("Proyecto")] as const;
  const lleno = materias.length >= MAX_MATERIAS;

  const anadir = () => {
    if (!nombre.trim() || lleno) return;
    agregarMateria(nombre, nombresEvaluaciones);
    setNombre("");
  };

  return (
    <div className="flex flex-col gap-4">
      <ResumenPromedio />

      {materias.length === 0 ? (
        <EstadoVacio
          glifo="calculadora"
          titulo={t("Aún no tienes materias en el promedio")}
          texto={t("Apunta tus calificaciones y Nexo te dice cómo vas en cada materia y cuánto necesitas sacar en lo que falta para aprobar.")}
          pasos={[t("Añade una materia (o tráelas desde tu horario)."), t("Pon cuánto vale cada evaluación y la calificación que ya sacaste."), t("Mira cuánto necesitas en lo que falta.")]}
        />
      ) : (
        <ul className="flex flex-col gap-4" aria-label={t("Materias")}>
          {materias.map((m) => (
            <li key={m.id}>
              <TarjetaMateria materia={m} escala={escala} />
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          anadir();
        }}
      >
        <input
          type="text"
          aria-label={t("Nombre de la materia nueva")}
          placeholder={t("Nombre de la materia")}
          value={nombre}
          maxLength={60}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-input h-8 min-w-0 flex-1 basis-48 border border-stroke bg-layer-alt px-3 text-body text-fg placeholder:text-fg-tertiary hover:bg-layer focus-visible:border-accent focus-visible:outline-none"
        />
        <Button type="submit" variant="accent" icon={<Glifo nombre="agregar" />} disabled={!nombre.trim() || lleno}>
          {t("Añadir materia")}
        </Button>
        {faltan.length > 0 && !lleno && (
          <Button
            onClick={() => {
              for (const m of faltan.slice(0, MAX_MATERIAS - materias.length)) agregarMateria(m, nombresEvaluaciones);
            }}
          >
            {faltan.length === 1 ? t("Traer 1 materia de mi horario") : t("Traer {n} materias de mi horario", { n: faltan.length })}
          </Button>
        )}
      </form>
      {lleno && <p className="text-caption text-fg-tertiary">{t("Llegaste al máximo de {n} materias.", { n: MAX_MATERIAS })}</p>}
    </div>
  );
}
