"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { Dialog } from "@/components/fluent/Dialog";
import { Glifo } from "@/components/fluent/Glifo";
import { SegmentedControl } from "@/components/fluent/SegmentedControl";
import { Selector } from "@/components/fluent/Selector";
import { useT, type PreferenciaIdioma } from "@/lib/i18n";
import { notificarSistema } from "@/lib/notificar";
import { Slider } from "@/components/fluent/Slider";
import { Switch } from "@/components/fluent/Switch";
import { ExpansorAjuste, FilaAjuste, TarjetaAjuste } from "@/components/fluent/TarjetaAjuste";
import { Avatar } from "@/components/shell/Avatar";
import { DialogoPerfil } from "@/components/shell/DialogoPerfil";
import { PlantillaPagina } from "@/components/shell/PlantillaPagina";
import { esEscritorio } from "@/lib/entorno";
import { useGuiasStore } from "@/store/guias-store";
import { novedadesRecientes, useNovedadesStore } from "@/store/novedades-store";
import { ACENTOS, useAjustesStore, type AlTerminar, type EfectoVentana, type PreferenciaTema, type SeccionInicial } from "@/store/ajustes-store";
import { usePerfilStore } from "@/store/perfil-store";
import { AjusteActualizaciones } from "./AjusteActualizaciones";
import { AjusteCanales } from "./AjusteCanales";
import { AjusteIndicePdfs } from "./AjusteIndicePdfs";
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
  const t = useT();
  const nombre = usePerfilStore((s) => s.nombre);
  const foto = usePerfilStore((s) => s.foto);
  const [perfil, setPerfil] = useState(false);
  const [restablecer, setRestablecer] = useState(false);
  const [escritorio, setEscritorio] = useState(false);
  const [version, setVersion] = useState("");

  useEffect(() => usePerfilStore.getState().cargar(), []);
  useEffect(() => setEscritorio(esEscritorio()), []);
  // La versión de verdad (la del programa que está corriendo), no una escrita a mano.
  useEffect(() => {
    if (esEscritorio()) void import("@tauri-apps/api/app").then(({ getVersion }) => getVersion()).then(setVersion).catch(() => {});
  }, []);

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Configuración" }]}
        titulo={t("Configuración")}
        descripcion={t("Personaliza Nexo. Los cambios se guardan solos, en este equipo.")}
        accion={
          <Button variant="accent" onClick={() => setRestablecer(true)}>
            {t("Restablecer valores")}
          </Button>
        }
        principal={
          <div className="flex max-w-[900px] flex-col gap-1">
            <Seccion titulo={t("Perfil")}>
              <TarjetaAjuste titulo={nombre ?? t("Sin perfil")} descripcion={nombre ? t("Tu nombre y tu foto se guardan solo en este equipo.") : t("Opcional: un nombre y una foto para que Nexo te salude.")}>
                <Avatar nombre={nombre} foto={foto} tam={40} />
                <Button onClick={() => setPerfil(true)}>{nombre ? t("Editar perfil") : t("Iniciar sesión")}</Button>
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo={t("Apariencia")}>
              <TarjetaAjuste glifo="pantalla" titulo={t("Idioma")} descripcion={t("El idioma de todo Nexo: menús, guías, novedades y avisos. «Igual que Windows» usa el de tu sistema.")}>
                <Selector<PreferenciaIdioma>
                  label={t("Idioma")}
                  value={a.idioma}
                  options={[
                    { value: "sistema", label: t("Igual que Windows") },
                    { value: "es", label: "Español" },
                    { value: "en", label: "English" },
                  ]}
                  onChange={(idioma) => a.cambiar({ idioma })}
                />
              </TarjetaAjuste>
              <TarjetaAjuste glifo="paleta" titulo={t("Tema")} descripcion={t("Elige entre claro, oscuro o el mismo que usa Windows.")}>
                <SegmentedControl<PreferenciaTema>
                  label={t("Tema")}
                  etiquetaVisible={false}
                  value={a.tema}
                  options={[
                    { value: "claro", label: t("Claro") },
                    { value: "oscuro", label: t("Oscuro") },
                    { value: "sistema", label: t("Sistema") },
                  ]}
                  onChange={(tema) => a.cambiar({ tema })}
                />
              </TarjetaAjuste>
              <TarjetaAjuste glifo="paleta" titulo={t("Color de acento")} descripcion={t("Botones, selecciones y controles.")}>
                <div role="radiogroup" aria-label={t("Color de acento")} className="flex flex-wrap justify-end gap-2">
                  {ACENTOS.map((c) => {
                    const activo = a.acento.toLowerCase() === c.valor.toLowerCase();
                    return (
                      <button
                        key={c.valor}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        aria-label={t(c.nombre)}
                        title={t(c.nombre)}
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
              <TarjetaAjuste glifo="pantalla" titulo={t("Efecto de ventana")} descripcion={t("Material del fondo de la ventana.")}>
                <SegmentedControl<EfectoVentana>
                  label={t("Efecto de ventana")}
                  etiquetaVisible={false}
                  value={a.efecto}
                  options={[
                    { value: "mica", label: t("Mica") },
                    { value: "acrilico", label: t("Acrílico") },
                    { value: "ninguno", label: t("Ninguno") },
                  ]}
                  onChange={(efecto) => a.cambiar({ efecto })}
                />
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo={t("Reproducción")}>
              <TarjetaAjuste glifo="volumen" titulo={t("Volumen predeterminado")} descripcion={t("Con el que empieza a sonar todo al abrir Nexo.")}>
                <div className="flex w-[260px] items-center gap-3">
                  <Slider label={t("Volumen predeterminado")} value={a.volumenPorDefecto} max={100} valueText={`${a.volumenPorDefecto} %`} onCommit={(v) => a.cambiar({ volumenPorDefecto: v })} onChange={(v) => a.cambiar({ volumenPorDefecto: v })} />
                  <span className="tabular w-10 text-right text-caption text-fg-secondary">{a.volumenPorDefecto} %</span>
                </div>
              </TarjetaAjuste>
              <TarjetaAjuste glifo="reproducir" titulo={t("Reproducción automática")} descripcion={t("Al abrir un enlace directo a un video, empieza a reproducirse solo.")}>
                <Switch checked={a.reproduccionAutomatica} onChange={(v) => a.cambiar({ reproduccionAutomatica: v })} label={t("Reproducción automática")} />
              </TarjetaAjuste>
              <TarjetaAjuste glifo="musica" titulo={t("Música sin parar (como Spotify)")} descripcion={t("Con Spotify conectado, al elegir una canción la música sigue sola con canciones parecidas, sin tener que armar una lista. Apágalo si prefieres que se detenga al terminar.")}>
                <Switch checked={a.seguirConSimilares} onChange={(v) => a.cambiar({ seguirConSimilares: v })} label={t("Música sin parar")} />
              </TarjetaAjuste>
              <TarjetaAjuste glifo="campana" titulo={t("Avisar qué canción suena")} descripcion={t("Una notificación del sistema cada vez que empieza una canción nueva.")}>
                <Switch checked={a.avisarCambioCancion} onChange={(v) => a.cambiar({ avisarCambioCancion: v })} label={t("Avisar qué canción suena")} />
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo={t("Avisos")}>
              <TarjetaAjuste glifo="campana" titulo={t("Avisar antes de cada clase")} descripcion={t("Una notificación de Windows unos minutos antes, con el aula y el docente. Usa tu horario.")}>
                <Selector<number>
                  label={t("Avisar antes de cada clase")}
                  value={a.avisoClaseMin}
                  options={[
                    { value: 0, label: t("No avisar") },
                    { value: 5, label: t("5 minutos antes") },
                    { value: 10, label: t("10 minutos antes") },
                    { value: 15, label: t("15 minutos antes") },
                    { value: 30, label: t("30 minutos antes") },
                  ]}
                  onChange={(avisoClaseMin) => a.cambiar({ avisoClaseMin })}
                />
              </TarjetaAjuste>
              <TarjetaAjuste glifo="calendario" titulo={t("Resumen del día")} descripcion={t("Al empezar el día, una notificación con tus clases, tareas y cumpleaños de hoy.")}>
                <div className="flex items-center gap-3">
                  {a.resumenDia && (
                    <Selector<number>
                      label={t("Hora del resumen")}
                      value={a.resumenHora}
                      options={Array.from({ length: 14 }, (_, h) => ({ value: h, label: `${String(h).padStart(2, "0")}:00` }))}
                      onChange={(resumenHora) => a.cambiar({ resumenHora })}
                    />
                  )}
                  <Switch checked={a.resumenDia} onChange={(v) => a.cambiar({ resumenDia: v })} label={t("Resumen del día")} />
                </div>
              </TarjetaAjuste>
              <TarjetaAjuste glifo="informacion" titulo={t("Probar una notificación")} descripcion={t("Para comprobar que Windows te las muestra. Avisan mientras Nexo esté abierto, aunque sea en la bandeja.")}>
                <Button onClick={() => void notificarSistema("Nexo", t("Así se verán tus avisos de clases y tareas. Al pulsarlo vuelves a Configuración."), "prueba", "/configuracion")}>{t("Enviar aviso de prueba")}</Button>
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo={t("Inicio")}>
              <TarjetaAjuste glifo="pantalla" titulo={t("Al abrir Nexo, mostrar")} descripcion={t("La pantalla con la que arranca. «La última que usaste» retoma donde lo dejaste (sin volver a Configuración).")}>
                <Selector<SeccionInicial>
                  label={t("Pantalla de inicio")}
                  value={a.seccionInicial}
                  options={[
                    { value: "inicio", label: t("Inicio (bienvenida)") },
                    { value: "ultima", label: t("La última usada") },
                    { value: "video", label: t("Video") },
                    { value: "musica", label: t("Música") },
                    { value: "documentos", label: t("Documentos") },
                    { value: "calendario", label: t("Calendario") },
                  ]}
                  onChange={(seccionInicial) => a.cambiar({ seccionInicial })}
                />
              </TarjetaAjuste>
            </Seccion>

            {escritorio && (
              <Seccion titulo={t("Aplicación")}>
                <AjusteInicioAutomatico />
                <TarjetaAjuste glifo="pantalla" titulo={t("Seguir sonando en la bandeja")} descripcion={t("Al cerrar la ventana, Nexo se oculta a la bandeja del sistema en vez de cerrarse. «Salir» en su menú lo cierra de verdad.")}>
                  <Switch checked={a.segundoPlano} onChange={(v) => a.cambiar({ segundoPlano: v })} label={t("Seguir sonando en la bandeja")} />
                </TarjetaAjuste>
              </Seccion>
            )}

            <Seccion titulo={t("Documentos")}>
              {escritorio && (
                <TarjetaAjuste glifo="documentos" titulo={t("Convertir con Microsoft Office")} descripcion={t("Si tienes Word, Excel o PowerPoint instalados, las conversiones (Word, Excel y PowerPoint a PDF, y PDF a Word) las hace Office: el resultado sale igual que guardarlo desde ahí. Si no, se usa el motor básico de Nexo.")}>
                  <Switch checked={a.usarOffice} onChange={(v) => a.cambiar({ usarOffice: v })} label={t("Convertir con Microsoft Office")} />
                </TarjetaAjuste>
              )}
              {escritorio && <AjusteIndicePdfs />}
              {escritorio && (
                <TarjetaAjuste glifo="carpeta" titulo={t("Elegir dónde guardar")} descripcion={t("Al descargar un resultado se abre «Guardar como», empezando en la carpeta de tus materias (Documentos/Nexo/Tareas). Si lo apagas, se guarda directo en Descargas.")}>
                  <Switch checked={a.preguntarDondeGuardar} onChange={(v) => a.cambiar({ preguntarDondeGuardar: v })} label={t("Elegir dónde guardar")} />
                </TarjetaAjuste>
              )}
              <TarjetaAjuste glifo="descargar" titulo={t("Al terminar una conversión")} descripcion={t("Qué hacer con el resultado cuando está listo.")}>
                <SegmentedControl<Extract<AlTerminar, "nada" | "descargar">>
                  label={t("Al terminar una conversión")}
                  etiquetaVisible={false}
                  value={a.alTerminar === "descargar" ? "descargar" : "nada"}
                  options={[
                    { value: "nada", label: t("Esperar") },
                    { value: "descargar", label: t("Descargar solo") },
                  ]}
                  onChange={(alTerminar) => a.cambiar({ alTerminar })}
                />
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo={t("Canales")}>
              <AjusteCanales />
            </Seccion>

            <Seccion titulo={t("Calendario")}>
              <TarjetaAjuste glifo="campana" titulo={t("Avisos de cumpleaños")} descripcion={t("Cuándo avisar, a qué hora y el permiso de notificaciones se eligen en el propio calendario.")}>
                <Link href="/calendario" className="rounded-control inline-flex h-8 items-center border border-stroke bg-layer-alt px-4 text-body text-fg shadow-card transition-colors duration-exit ease-fluent hover:bg-layer">
                  {t("Abrir el calendario")}
                </Link>
              </TarjetaAjuste>
            </Seccion>

            <Seccion titulo={t("Acerca de")}>
              <TarjetaAjuste glifo="informacion" titulo={t("Bienvenida y guías")} descripcion={t("Vuelve a ver la bienvenida. Cada sección tiene además su propia guía: pulsa el signo de interrogación (?) de la barra de arriba.")}>
                <Button onClick={() => useGuiasStore.getState().abrir("bienvenida")}>{t("Ver de nuevo")}</Button>
              </TarjetaAjuste>
              <AjusteActualizaciones />
              {escritorio && (
                <TarjetaAjuste glifo="informacion" titulo={t("Novedades")} descripcion={t("Qué trajeron las últimas versiones de Nexo.")}>
                  <Button
                    onClick={() =>
                      void import("@tauri-apps/api/app").then(async ({ getVersion }) => {
                        const v = await getVersion();
                        useNovedadesStore.getState().abrir(novedadesRecientes(v), v);
                      })
                    }
                  >
                    {t("Ver novedades")}
                  </Button>
                </TarjetaAjuste>
              )}
              <ExpansorAjuste
                glifo="informacion"
                titulo="Nexo"
                descripcion={version ? `${t("Video, música, documentos y calendario en una sola ventana.")} ${t("Versión {v}.", { v: version })}` : t("Video, música, documentos y calendario en una sola ventana.")}
                filas={
                  <>
                    <FilaAjuste titulo={t("Tus archivos")} descripcion={t("Las conversiones de Documentos se hacen dentro de la aplicación: los archivos no salen de tu equipo.")} />
                    <FilaAjuste titulo={t("Tus datos")} descripcion={t("Ajustes, perfil, canales y cumpleaños se guardan solo en este equipo. Si borras los datos del navegador, se pierden.")} />
                    <FilaAjuste titulo={t("Servicios externos")} descripcion={t("Video usa YouTube y Música usa Spotify; se cargan desde sus propios servidores cuando los abres.")} />
                  </>
                }
              />
            </Seccion>
          </div>
        }
      />

      <DialogoPerfil abierto={perfil} onCerrar={() => setPerfil(false)} />
      <Dialog open={restablecer} onClose={() => setRestablecer(false)} title={t("Restablecer valores")} maxWidth={440}>
        <p className="text-body text-fg-secondary">{t("Tema, acento, efecto, volumen y demás ajustes de esta página vuelven a sus valores de fábrica. Tu perfil, tus canales y tus cumpleaños no se tocan.")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setRestablecer(false)}>{t("Cancelar")}</Button>
          <Button
            variant="accent"
            onClick={() => {
              a.restablecer();
              setRestablecer(false);
            }}
          >
            {t("Restablecer")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
