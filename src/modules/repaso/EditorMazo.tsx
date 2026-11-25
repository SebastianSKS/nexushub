"use client";

import { localeActual, useT } from "@/lib/i18n";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Add20Regular } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { Card } from "@/components/fluent/Card";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { InfoBar } from "@/components/fluent/InfoBar";
import { TextInput } from "@/components/fluent/TextInput";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { lasQueCostaron, pendientesDe, proximoRepaso, useRepasoStore, type Mazo, type Sesion, type Tarjeta } from "@/store/repaso-store";
import { cuandoToca } from "./cuando";
import { rutaEstudio, rutaPractica } from "./rutas-repaso";

const AREA = "min-h-[96px] w-full rounded-input border border-stroke bg-layer-alt px-3 py-2 text-body text-fg placeholder:text-fg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function EditorMazo({ mazo }: { mazo: Mazo }) {
  const t = useT();
  const router = useRouter();
  const todas = useRepasoStore((s) => s.tarjetas);
  const tarjetas = useMemo(() => todas.filter((c) => c.mazoId === mazo.id), [todas, mazo.id]);
  const pendientes = useMemo(() => pendientesDe(tarjetas, mazo.id).length, [tarjetas, mazo.id]);
  const siguiente = proximoRepaso(tarjetas, mazo.id);
  const sesiones = useRepasoStore((s) => s.sesiones);
  // Los repasos de este mazo, el más reciente primero.
  const historial = useMemo(() => sesiones.filter((x) => x.mazoId === mazo.id).reverse().slice(0, 6), [sesiones, mazo.id]);

  const [frente, setFrente] = useState("");
  const [reverso, setReverso] = useState("");
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [editar, setEditar] = useState<Tarjeta | null>(null);
  const [renombrar, setRenombrar] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const frenteRef = useRef<HTMLInputElement>(null);

  const anadir = () => {
    if (!frente.trim() || !reverso.trim()) return;
    useRepasoStore.getState().agregarTarjeta(mazo.id, frente, reverso);
    setFrente("");
    setReverso("");
    frenteRef.current?.focus();
  };

  const importar = () => {
    const n = useRepasoStore.getState().importarTexto(mazo.id, importText);
    setImportMsg(n > 0 ? t("Se crearon {n} tarjetas.", { n }) : t("No se encontraron líneas con «término - definición»."));
    if (n > 0) setImportText("");
  };

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: t("Repaso"), href: "/repaso" }, { etiqueta: mazo.nombre }]}
        titulo={mazo.nombre}
        descripcion={mazo.materia || t("{n} tarjetas", { n: tarjetas.length })}
        accion={
          <div className="flex gap-2">
            {pendientes > 0 && (
              <Button variant="accent" onClick={() => router.push(rutaEstudio(mazo.id))}>
                {t("Estudiar ({n})", { n: pendientes })}
              </Button>
            )}
            <Button variant={pendientes > 0 ? "standard" : "accent"} disabled={tarjetas.length === 0} onClick={() => router.push(rutaPractica(mazo.id))}>
              {t("Practicar todo")}
            </Button>
          </div>
        }
        principal={
          <div className="flex flex-col gap-5">
            {pendientes === 0 && tarjetas.length > 0 && (
              <InfoBar severity="success" title={t("Estás al día con este mazo")}>
                {siguiente !== null ? t("Lo siguiente toca {cuando}. Si quieres adelantar, «Practicar todo» no cambia el calendario.", { cuando: cuandoToca(siguiente) }) : t("«Practicar todo» te deja repasarlo cuando quieras.")}
              </InfoBar>
            )}

            {historial.length > 0 && <Historial sesiones={historial} onRepetir={(id, soloCostaron) => router.push(rutaPractica(mazo.id, id, soloCostaron))} />}

            {/* Añadir una tarjeta */}
            <Card className="flex flex-col gap-3 p-4">
              <span className="text-subtitle text-fg">{t("Añadir una tarjeta")}</span>
              <div className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2">
                <TextInput ref={frenteRef} label={t("Frente (pregunta)")} value={frente} maxLength={500} onChange={(e) => setFrente(e.target.value)} />
                <TextInput label={t("Reverso (respuesta)")} value={reverso} maxLength={1000} onChange={(e) => setReverso(e.target.value)} onKeyDown={(e) => e.key === "Enter" && anadir()} />
              </div>
              <div>
                <Button variant="accent" icon={<Add20Regular />} disabled={!frente.trim() || !reverso.trim()} onClick={anadir}>
                  {t("Añadir tarjeta")}
                </Button>
              </div>
            </Card>

            {/* Importar desde apuntes (puente con el OCR) */}
            <details className="rounded-control border border-stroke bg-layer-alt/50">
              <summary className="cursor-pointer select-none px-4 py-3 text-body text-fg">{t("Pegar apuntes y crear tarjetas de golpe")}</summary>
              <div className="flex flex-col gap-3 px-4 pb-4">
                <p className="text-caption text-fg-secondary">{t("Pega texto (por ejemplo, el que saques con OCR de tus apuntes). Cada línea «término - definición» se vuelve una tarjeta. Separadores válidos: - : = o tabulador.")}</p>
                <textarea className={AREA} value={importText} maxLength={20000} placeholder={t("Fotosíntesis - proceso por el que las plantas…\nMitocondria: produce la energía de la célula")} onChange={(e) => setImportText(e.target.value)} />
                <div className="flex items-center gap-3">
                  <Button variant="accent" disabled={!importText.trim()} onClick={importar}>
                    {t("Crear tarjetas del texto")}
                  </Button>
                  {importMsg && <span className="text-caption text-fg-secondary">{importMsg}</span>}
                </div>
              </div>
            </details>

            {/* Lista de tarjetas */}
            {tarjetas.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-caption text-fg-tertiary">{t("{n} tarjetas", { n: tarjetas.length })}</span>
                {tarjetas.map((c) => (
                  <Card key={c.id} className="flex items-start gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body text-fg">{c.frente}</p>
                      <p className="truncate text-caption text-fg-secondary">{c.reverso}</p>
                    </div>
                    <IconButton label={t("Editar tarjeta")} onClick={() => setEditar(c)}>
                      <Glifo nombre="editar" tam={16} />
                    </IconButton>
                    <IconButton label={t("Borrar tarjeta")} onClick={() => useRepasoStore.getState().borrarTarjeta(c.id)}>
                      <Glifo nombre="eliminar" tam={16} />
                    </IconButton>
                  </Card>
                ))}
              </div>
            )}
          </div>
        }
        lateral={
          <div className="flex flex-col gap-3">
            <Card className="flex flex-col gap-2 p-4">
              <span className="text-subtitle text-fg">{t("Resumen")}</span>
              <Linea etiqueta={t("Tarjetas")} valor={String(tarjetas.length)} />
              <Linea etiqueta={t("Para hoy")} valor={String(pendientes)} />
              {pendientes === 0 && siguiente !== null && <Linea etiqueta={t("Siguiente")} valor={cuandoToca(siguiente)} />}
              {mazo.materia && <Linea etiqueta={t("Materia")} valor={mazo.materia} />}
            </Card>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setRenombrar(true)}>
                {t("Renombrar")}
              </Button>
              <Button className="flex-1" onClick={() => setConfirmarBorrar(true)}>
                {t("Borrar mazo")}
              </Button>
            </div>
          </div>
        }
      />

      {editar && <DialogoEditar tarjeta={editar} onCerrar={() => setEditar(null)} />}
      {renombrar && <DialogoRenombrar mazo={mazo} onCerrar={() => setRenombrar(false)} />}

      <Dialog open={confirmarBorrar} onClose={() => setConfirmarBorrar(false)} title={t("¿Borrar este mazo?")}>
        <div className="flex flex-col gap-4">
          <p className="text-body text-fg-secondary">{t("Se borrarán el mazo «{nombre}» y sus {n} tarjetas. No se puede deshacer.", { nombre: mazo.nombre, n: tarjetas.length })}</p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirmarBorrar(false)}>{t("Cancelar")}</Button>
            <Button
              variant="accent"
              onClick={() => {
                useRepasoStore.getState().borrarMazo(mazo.id);
                router.replace("/repaso");
              }}
            >
              {t("Borrar mazo")}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/** Los repasos ya hechos, para volver a hacer uno entero o solo lo que salió mal. */
function Historial({ sesiones, onRepetir }: { sesiones: Sesion[]; onRepetir: (sesionId: string, soloCostaron: boolean) => void }) {
  const t = useT();
  const cuando = (ms: number) => new Date(ms).toLocaleString(localeActual(), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <div className="flex flex-col gap-2">
      <span className="text-subtitle text-fg">{t("Repasos anteriores")}</span>
      {sesiones.map((x) => {
        const costaron = lasQueCostaron(x).length;
        return (
          <Card key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
            <div className="min-w-[12rem] flex-1">
              <p className="text-body text-fg">
                {cuando(x.fecha)}
                {x.practica && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-caption text-accent">{t("práctica")}</span>}
              </p>
              <p className="text-caption text-fg-secondary">
                {costaron === 0 ? t("Tarjetas: {n}, todas a la primera", { n: x.resultados.length }) : t("Tarjetas: {n} · te costaron: {c}", { n: x.resultados.length, c: costaron })}
              </p>
            </div>
            <div className="flex gap-2">
              {costaron > 0 && (
                <Button className="h-7" onClick={() => onRepetir(x.id, true)}>
                  {t("Solo las que costaron")}
                </Button>
              )}
              <Button className="h-7" onClick={() => onRepetir(x.id, false)}>
                {t("Repetir")}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between text-body">
      <span className="text-fg-secondary">{etiqueta}</span>
      <span className="text-fg">{valor}</span>
    </div>
  );
}

function DialogoEditar({ tarjeta, onCerrar }: { tarjeta: Tarjeta; onCerrar: () => void }) {
  const t = useT();
  const [frente, setFrente] = useState(tarjeta.frente);
  const [reverso, setReverso] = useState(tarjeta.reverso);
  const guardar = () => {
    useRepasoStore.getState().editarTarjeta(tarjeta.id, frente, reverso);
    onCerrar();
  };
  return (
    <Dialog open onClose={onCerrar} title={t("Editar tarjeta")}>
      <div className="flex flex-col gap-3">
        <TextInput label={t("Frente (pregunta)")} value={frente} autoFocus maxLength={500} onChange={(e) => setFrente(e.target.value)} />
        <TextInput label={t("Reverso (respuesta)")} value={reverso} maxLength={1000} onChange={(e) => setReverso(e.target.value)} onKeyDown={(e) => e.key === "Enter" && frente.trim() && reverso.trim() && guardar()} />
        <div className="mt-1 flex justify-end gap-2">
          <Button onClick={onCerrar}>{t("Cancelar")}</Button>
          <Button variant="accent" disabled={!frente.trim() || !reverso.trim()} onClick={guardar}>
            {t("Guardar")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function DialogoRenombrar({ mazo, onCerrar }: { mazo: Mazo; onCerrar: () => void }) {
  const t = useT();
  const [nombre, setNombre] = useState(mazo.nombre);
  const [materia, setMateria] = useState(mazo.materia);
  const guardar = () => {
    useRepasoStore.getState().renombrarMazo(mazo.id, nombre, materia);
    onCerrar();
  };
  return (
    <Dialog open onClose={onCerrar} title={t("Renombrar mazo")}>
      <div className="flex flex-col gap-3">
        <TextInput label={t("Nombre del mazo")} value={nombre} autoFocus maxLength={80} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nombre.trim() && guardar()} />
        <TextInput label={t("Materia (opcional)")} value={materia} maxLength={60} onChange={(e) => setMateria(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nombre.trim() && guardar()} />
        <div className="mt-1 flex justify-end gap-2">
          <Button onClick={onCerrar}>{t("Cancelar")}</Button>
          <Button variant="accent" disabled={!nombre.trim()} onClick={guardar}>
            {t("Guardar")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
