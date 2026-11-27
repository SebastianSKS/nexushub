"use client";

import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Add20Regular } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Dialog } from "@/components/fluent/Dialog";
import { EstadoVacio } from "@/components/fluent/EstadoVacio";
import { Glifo } from "@/components/fluent/Glifo";
import { TextInput } from "@/components/fluent/TextInput";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { idsDeRonda, pendientesDe, proximoRepaso, useRepasoStore, type Mazo } from "@/store/repaso-store";
import { cuandoToca } from "./cuando";
import { rutaEstudio, rutaMazo, rutaPractica } from "./rutas-repaso";
import { EditorMazo } from "./EditorMazo";
import { SesionEstudio } from "./SesionEstudio";

/** /repaso — Tarjetas de estudio con repetición espaciada. Todo vive en el equipo. */
export function PaginaRepaso() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const mazoId = params.get("mazo");
  const modo = params.get("modo");

  const cargado = useRepasoStore((s) => s.cargado);
  const mazos = useRepasoStore((s) => s.mazos);
  const tarjetas = useRepasoStore((s) => s.tarjetas);

  const [dialogo, setDialogo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [materia, setMateria] = useState("");

  useEffect(() => {
    useRepasoStore.getState().cargar();
  }, []);

  const mazoAbierto = mazoId ? mazos.find((m) => m.id === mazoId) : undefined;
  // Si la URL apunta a un mazo que ya no existe, se vuelve al inicio (solo cuando ya cargó).
  useEffect(() => {
    if (cargado && mazoId && !mazoAbierto) router.replace("/repaso");
  }, [cargado, mazoId, mazoAbierto, router]);

  const crear = () => {
    const id = useRepasoStore.getState().crearMazo(nombre, materia);
    setNombre("");
    setMateria("");
    setDialogo(false);
    router.push(rutaMazo(id));
  };

  if (mazoAbierto && (modo === "estudio" || modo === "practica")) {
    // La clave hace que cada ronda empiece de cero aunque se pase de una a otra sin salir de Repaso.
    return <Ronda key={params.toString()} mazo={mazoAbierto} practica={modo === "practica"} sesionId={params.get("sesion")} soloCostaron={params.get("costaron") === "1"} />;
  }
  if (mazoAbierto) return <EditorMazo mazo={mazoAbierto} />;

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: t("Repaso") }]}
        titulo={t("Repaso")}
        descripcion={t("Tarjetas de estudio que se repiten justo antes de que se te olviden. Y puedes practicar cuando quieras.")}
        accion={
          <Button variant="accent" icon={<Add20Regular />} onClick={() => setDialogo(true)}>
            {t("Nuevo mazo")}
          </Button>
        }
        principal={
          !cargado ? null : mazos.length === 0 ? (
            <EstadoVacio
              glifo="repaso"
              titulo={t("Aún no tienes mazos")}
              texto={t("Un mazo es un grupo de tarjetas (pregunta y respuesta) de una materia. Xook te las repite con el tiempo para que se te queden.")}
              pasos={[t("Crea un mazo (por ejemplo, «Cálculo»)."), t("Añade tarjetas, o pega tus apuntes y Xook las arma solo."), t("Pulsa Estudiar: respondes y calificas qué tan bien te la supiste.")]}
              acciones={
                <Button variant="accent" icon={<Add20Regular />} onClick={() => setDialogo(true)}>
                  {t("Nuevo mazo")}
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
              {mazos.map((m) => {
                const total = tarjetas.filter((c) => c.mazoId === m.id).length;
                const pendientes = pendientesDe(tarjetas, m.id).length;
                const siguiente = proximoRepaso(tarjetas, m.id);
                return (
                  <Card key={m.id} reveal className="flex flex-col gap-3 p-4">
                    <button type="button" onClick={() => router.push(rutaMazo(m.id))} className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <Glifo nombre="repaso" tam={18} />
                        <span className="truncate text-subtitle text-fg">{m.nombre}</span>
                      </div>
                      {m.materia && <span className="mt-0.5 block truncate text-caption text-fg-tertiary">{m.materia}</span>}
                    </button>
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-caption text-fg-secondary">
                        {t("{n} tarjetas", { n: total })}
                        {pendientes > 0 ? (
                          <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-accent">{t("{n} para hoy", { n: pendientes })}</span>
                        ) : (
                          siguiente !== null && <span className="ml-2 text-fg-tertiary">{t("Al día · toca {cuando}", { cuando: cuandoToca(siguiente) })}</span>
                        )}
                      </span>
                      <div className="flex shrink-0 gap-2">
                        <Button className="h-7" onClick={() => router.push(rutaMazo(m.id))}>
                          {t("Abrir")}
                        </Button>
                        {pendientes > 0 ? (
                          <Button variant="accent" className="h-7" onClick={() => router.push(rutaEstudio(m.id))}>
                            {t("Estudiar")}
                          </Button>
                        ) : (
                          <Button variant="accent" className="h-7" disabled={total === 0} onClick={() => router.push(rutaPractica(m.id))}>
                            {t("Practicar")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        }
      />

      <Dialog open={dialogo} onClose={() => setDialogo(false)} title={t("Nuevo mazo")}>
        <div className="flex flex-col gap-3">
          <TextInput label={t("Nombre del mazo")} value={nombre} autoFocus maxLength={80} placeholder={t("Cálculo, Historia, Inglés…")} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nombre.trim() && crear()} />
          <TextInput label={t("Materia (opcional)")} value={materia} maxLength={60} onChange={(e) => setMateria(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nombre.trim() && crear()} />
          <div className="mt-1 flex justify-end gap-2">
            <Button onClick={() => setDialogo(false)}>{t("Cancelar")}</Button>
            <Button variant="accent" disabled={!nombre.trim()} onClick={crear}>
              {t("Crear mazo")}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/** Fija las tarjetas de la ronda al entrar, para que calificar no la cambie a medio camino. */
function Ronda({ mazo, practica, sesionId, soloCostaron }: { mazo: Mazo; practica: boolean; sesionId: string | null; soloCostaron: boolean }) {
  const [ids] = useState(() => idsDeRonda(useRepasoStore.getState(), mazo.id, practica, sesionId, soloCostaron));
  return <SesionEstudio mazo={mazo} ids={ids} practica={practica} />;
}
