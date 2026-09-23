"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { Selector } from "@/components/fluent/Selector";
import { Slider } from "@/components/fluent/Slider";
import { Switch } from "@/components/fluent/Switch";
import { ExpansorAjuste, FilaAjuste, TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { Avatar } from "@/components/shell/Avatar";
import { DialogoPerfil } from "@/components/shell/DialogoPerfil";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { esEscritorio } from "@/lib/entorno";
import { ACENTOS, useAjustesStore, type AlTerminar, type EfectoVentana, type PreferenciaTema, type SeccionInicial } from "@/store/ajustes-store";
import { useAppStore } from "@/store/app-store";
import { usePerfilStore } from "@/store/perfil-store";
import { AjusteActualizaciones } from "./AjusteActualizaciones";
import { AjusteCanales } from "./AjusteCanales";
import { AjusteInicioAutomatico } from "./AjusteInicioAutomatico";

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1" aria-label={titulo}>
      <h2 className="mb-1 mt-3 text-body font-semibold text-fg first:mt-0">{titulo}</h2>
      {children}
    </section>
  );
}

/** /configuracion — hecha solo con SettingsCard y SettingsExpander, como la app Configuración de Windows. */
export function PaginaConfiguracion() {
  const a = useAjustesStore();
  const nombre = usePerfilStore((s) => s.nombre);
  const foto = usePerfilStore((s) => s.foto);
  const [perfil, setPerfil] = useState(false);
  const [restablecer, setRestablecer] = useState(false);
  const [escritorio, setEscritorio] = useState(false);

  useEffect(() => usePerfilStore.getState().cargar(), []);
  useEffect(() => setEscritorio(esEscritorio()), []);

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Configuración" }]}
        titulo="Configuración"
        descripcion="Personaliza NexusHub. Los cambios se guardan solos, en este equipo."
        accion={
          <Button variant="accent" onClick={() => setRestablecer(true)}>
            Restablecer valores
          </Button>
        }
        principal={
          <div className="flex max-w-[900px] flex-col gap-1">
            <Seccion titulo="Perfil">
              <TarjetaAjuste titulo={nombre ?? "Sin perfil"} descripcion={nombre ? "Tu nombre y tu foto se guardan solo en este equipo." : "Opcional: un nombre y una foto para que NexusHub te salude."}>
                <Avatar nombre={nombre} foto={foto} tam={40} />
                <Button onClick={() => setPerfil(true)}>{nombre ? "Editar perfil" : "Iniciar sesión"}</Button>
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo="Apariencia">
              <TarjetaAjuste glifo="paleta" titulo="Tema" descripcion="Elige entre claro, oscuro o el mismo que usa Windows.">
                <SegmentedControl<PreferenciaTema>
                  label="Tema"
                  etiquetaVisible={false}
                  value={a.tema}
                  options={[
                    { value: "claro", label: "Claro" },
                    { value: "oscuro", label: "Oscuro" },
                    { value: "sistema", label: "Sistema" },
                  ]}
                  onChange={(tema) => a.cambiar({ tema })}
                />
              </TarjetaAjuste>
              <TarjetaAjuste glifo="paleta" titulo="Color de acento" descripcion="Botones, selecciones y controles.">
                <div role="radiogroup" aria-label="Color de acento" className="flex flex-wrap justify-end gap-2">
                  {ACENTOS.map((c) => {
                    const activo = a.acento.toLowerCase() === c.valor.toLowerCase();
                    return (
                      <button
                        key={c.valor}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        aria-label={c.nombre}
                        title={c.nombre}
                        onClick={() => a.cambiar({ acento: c.valor })}
                        className={clsx("flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform duration-exit ease-fluent hover:scale-110", activo ? "border-fg" : "border-transparent")}
                        style={{ backgroundColor: c.valor }}
                      >
                        {activo && <Glifo nombre="exito" tam={11} className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              </TarjetaAjuste>
              <TarjetaAjuste glifo="pantalla" titulo="Efecto de ventana" descripcion="Material del fondo de la ventana.">
                <SegmentedControl<EfectoVentana>
                  label="Efecto de ventana"
                  etiquetaVisible={false}
                  value={a.efecto}
                  options={[
                    { value: "mica", label: "Mica" },
                    { value: "acrilico", label: "Acrílico" },
                    { value: "ninguno", label: "Ninguno" },
                  ]}
                  onChange={(efecto) => a.cambiar({ efecto })}
                />
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo="Reproducción">
              <TarjetaAjuste glifo="volumen" titulo="Volumen predeterminado" descripcion="Con el que empieza a sonar todo al abrir NexusHub.">
                <div className="flex w-[260px] items-center gap-3">
                  <Slider label="Volumen predeterminado" value={a.volumenPorDefecto} max={100} valueText={`${a.volumenPorDefecto} %`} onCommit={(v) => a.cambiar({ volumenPorDefecto: v })} onChange={(v) => a.cambiar({ volumenPorDefecto: v })} />
                  <span className="tabular w-10 text-right text-caption text-fg-secondary">{a.volumenPorDefecto} %</span>
                </div>
              </TarjetaAjuste>
              <TarjetaAjuste glifo="reproducir" titulo="Reproducción automática" descripcion="Al abrir un enlace directo a un video, empieza a reproducirse solo.">
                <Switch checked={a.reproduccionAutomatica} onChange={(v) => a.cambiar({ reproduccionAutomatica: v })} label="Reproducción automática" />
              </TarjetaAjuste>
              <TarjetaAjuste glifo="campana" titulo="Avisar qué canción suena" descripcion="Una notificación del sistema cada vez que empieza una canción nueva.">
                <Switch checked={a.avisarCambioCancion} onChange={(v) => a.cambiar({ avisarCambioCancion: v })} label="Avisar qué canción suena" />
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo="Inicio">
              <TarjetaAjuste glifo="pantalla" titulo="Al abrir NexusHub, mostrar" descripcion="La pantalla con la que arranca. «La última que usaste» retoma donde lo dejaste (sin volver a Configuración).">
                <Selector<SeccionInicial>
                  label="Pantalla de inicio"
                  value={a.seccionInicial}
                  options={[
                    { value: "ultima", label: "La última usada" },
                    { value: "video", label: "Video" },
                    { value: "musica", label: "Música" },
                    { value: "documentos", label: "Documentos" },
                    { value: "calendario", label: "Calendario" },
                  ]}
                  onChange={(seccionInicial) => a.cambiar({ seccionInicial })}
                />
              </TarjetaAjuste>
            </Seccion>

            {escritorio && (
              <Seccion titulo="Aplicación">
                <AjusteInicioAutomatico />
                <TarjetaAjuste glifo="pantalla" titulo="Seguir sonando en la bandeja" descripcion="Al cerrar la ventana, NexusHub se oculta a la bandeja del sistema en vez de cerrarse. «Salir» en su menú lo cierra de verdad.">
                  <Switch checked={a.segundoPlano} onChange={(v) => a.cambiar({ segundoPlano: v })} label="Seguir sonando en la bandeja" />
                </TarjetaAjuste>
              </Seccion>
            )}

            <Seccion titulo="Documentos">
              <TarjetaAjuste glifo="descargar" titulo="Al terminar una conversión" descripcion="Qué hacer con el resultado cuando está listo.">
                <SegmentedControl<Extract<AlTerminar, "nada" | "descargar">>
                  label="Al terminar una conversión"
                  etiquetaVisible={false}
                  value={a.alTerminar === "descargar" ? "descargar" : "nada"}
                  options={[
                    { value: "nada", label: "Esperar" },
                    { value: "descargar", label: "Descargar solo" },
                  ]}
                  onChange={(alTerminar) => a.cambiar({ alTerminar })}
                />
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo="Canales">
              <AjusteCanales />
            </Seccion>

            <Seccion titulo="Calendario">
              <TarjetaAjuste glifo="campana" titulo="Avisos de cumpleaños" descripcion="Cuándo avisar, a qué hora y el permiso de notificaciones se eligen en el propio calendario.">
                <Link href="/calendario" className="rounded-control inline-flex h-8 items-center border border-stroke bg-layer-alt px-4 text-body text-fg shadow-card transition-colors duration-exit ease-fluent hover:bg-layer">
                  Abrir el calendario
                </Link>
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo="Acerca de">
              <TarjetaAjuste glifo="informacion" titulo="Recorrido de bienvenida" descripcion="Las 5 pantallas que explican qué hace cada sección.">
                <Button onClick={() => useAppStore.getState().setTourAbierto(true)}>Ver de nuevo</Button>
              </TarjetaAjuste>
              <AjusteActualizaciones />
              <ExpansorAjuste
                glifo="informacion"
                titulo="NexusHub"
                descripcion="Video, música, documentos y calendario en una sola ventana. Versión 0.1.0."
                filas={
                  <>
                    <FilaAjuste titulo="Tus archivos" descripcion="Las conversiones de Documentos se hacen dentro de la aplicación: los archivos no salen de tu equipo." />
                    <FilaAjuste titulo="Tus datos" descripcion="Ajustes, perfil, canales y cumpleaños se guardan solo en este equipo. Si borras los datos del navegador, se pierden." />
                    <FilaAjuste titulo="Servicios externos" descripcion="Video usa YouTube y Música usa Spotify; se cargan desde sus propios servidores cuando los abres." />
                  </>
                }
              />
            </Seccion>
          </div>
        }
      />

      <DialogoPerfil abierto={perfil} onCerrar={() => setPerfil(false)} />
      <Dialog open={restablecer} onClose={() => setRestablecer(false)} title="Restablecer valores" maxWidth={440}>
        <p className="text-body text-fg-secondary">Tema, acento, efecto, volumen y demás ajustes de esta página vuelven a sus valores de fábrica. Tu perfil, tus canales y tus cumpleaños no se tocan.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setRestablecer(false)}>Cancelar</Button>
          <Button
            variant="accent"
            onClick={() => {
              a.restablecer();
              setRestablecer(false);
            }}
          >
            Restablecer
          </Button>
        </div>
      </Dialog>
    </>
  );
}
