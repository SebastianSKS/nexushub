"use client";

import { AjusteBajoConsumo } from "./AjusteBajoConsumo";
import { AjusteConsejos } from "./AjusteConsejos";
import { AjustePrimerosPasos } from "./AjustePrimerosPasos";
import { AjusteAyuda } from "./AjusteAyuda";
import { AjusteCopiaSeguridad } from "./AjusteCopiaSeguridad";
import { AjusteZoomInterfaz } from "./AjusteZoomInterfaz";
import { AjusteMovimiento } from "./AjusteMovimiento";
import { AjusteBarraLateral } from "./AjusteBarraLateral";
import { AjusteInicioSemana } from "./AjusteInicioSemana";
import { AjusteFormatoHora } from "./AjusteFormatoHora";
import { useHora } from "@/hooks/useHora";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { categoriaActiva, rutaAjustes, type CategoriaId } from "@/lib/ajustes-categorias";
import { Ancla, AjusteResaltado } from "./Ancla";
import { useGuiasStore } from "@/store/guias-store";
import { novedadesRecientes, useNovedadesStore } from "@/store/novedades-store";
import { ACENTOS, useAjustesStore, type AlTerminar, type EfectoVentana, type PreferenciaTema, type SeccionInicial } from "@/store/ajustes-store";
import { usePerfilStore } from "@/store/perfil-store";
import { AjusteActualizaciones } from "./AjusteActualizaciones";
import { AjusteCanales } from "./AjusteCanales";
import { AjusteIndicePdfs } from "./AjusteIndicePdfs";
import { AjusteInicioAutomatico } from "./AjusteInicioAutomatico";
import { AjusteNoMolestar } from "./AjusteNoMolestar";
import { AjusteOffice } from "./AjusteOffice";
import { AjusteSonidoAvisos } from "./AjusteSonidoAvisos";

/**
 * /configuracion — como la app Configuración de Windows: la barra lateral muestra las categorías (MenuAjustes) y aquí salen
 * solo los ajustes de la elegida. «?categoria=» elige cuál y «?ajuste=» lleva a uno en particular (así llega el
 * buscador). Los ajustes están hechos con SettingsCard y SettingsExpander.
 */
export function PaginaConfiguracion() {
  const a = useAjustesStore();
  const t = useT();
  const nombre = usePerfilStore((s) => s.nombre);
  const foto = usePerfilStore((s) => s.foto);
  const [perfil, setPerfil] = useState(false);
  const [restablecer, setRestablecer] = useState(false);
  const [escritorio, setEscritorio] = useState(false);
  const [version, setVersion] = useState("");
  const { enPunto } = useHora();
  const parametros = useSearchParams();
  const activa = categoriaActiva(parametros.get("categoria"));

  useEffect(() => usePerfilStore.getState().cargar(), []);
  useEffect(() => setEscritorio(esEscritorio()), []);
  // La versión de verdad (la del programa que está corriendo), no una escrita a mano.
  useEffect(() => {
    if (esEscritorio()) void import("@tauri-apps/api/app").then(({ getVersion }) => getVersion()).then(setVersion).catch(() => {});
  }, []);

  const paneles: Record<CategoriaId, React.ReactNode> = {
    perfil: (
      <>
        <Ancla id="perfil">
          <TarjetaAjuste titulo={nombre ?? t("Sin perfil")} descripcion={nombre ? t("Tu nombre y tu foto se guardan solo en este equipo.") : t("Opcional: un nombre y una foto para que Nexo te salude.")}>
            <Avatar nombre={nombre} foto={foto} tam={40} />
            <Button onClick={() => setPerfil(true)}>{nombre ? t("Editar perfil") : t("Iniciar sesión")}</Button>
          </TarjetaAjuste>
        </Ancla>
      </>
    ),
    apariencia: (
      <>
        <Ancla id="tema">
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
        </Ancla>
        <Ancla id="acento">
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
              {/* Cualquier otro color: el selector del sistema. Queda marcado si el acento actual no es de los de arriba. */}
              <label
                title={t("Otro color")}
                className={clsx("relative flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 transition-transform duration-exit ease-fluent hover:scale-110 focus-within:ring-2 focus-within:ring-accent", ACENTOS.some((c) => c.valor.toLowerCase() === a.acento.toLowerCase()) ? "border-transparent" : "border-fg")}
                style={{ background: ACENTOS.some((c) => c.valor.toLowerCase() === a.acento.toLowerCase()) ? "conic-gradient(#e5484d, #f0812a, #ffd43b, #2ec4a6, #3b82f6, #a26bff, #e5509f, #e5484d)" : a.acento }}
              >
                <input type="color" value={a.acento.toLowerCase()} aria-label={t("Otro color")} onChange={(e) => a.cambiar({ acento: e.target.value.toUpperCase() })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                {!ACENTOS.some((c) => c.valor.toLowerCase() === a.acento.toLowerCase()) && <Glifo nombre="exito" tam={11} className="pointer-events-none text-white mix-blend-difference" />}
              </label>
            </div>
          </TarjetaAjuste>
        </Ancla>
        <Ancla id="fondo-musical">
          <TarjetaAjuste glifo="musica" titulo={t("Fondo según la música")} descripcion={t("Mientras suena algo, el fondo de Nexo toma los colores de su portada y se mueve despacio; en pausa se queda quieto. Con el modo de bajo consumo no se muestra.")}>
            <Switch checked={a.fondoMusical} onChange={(v) => a.cambiar({ fondoMusical: v })} label={t("Fondo según la música")} />
          </TarjetaAjuste>
        </Ancla>
        <Ancla id="tamano"><AjusteZoomInterfaz /></Ancla>
        <Ancla id="animaciones"><AjusteMovimiento /></Ancla>
        <Ancla id="barra-lateral"><AjusteBarraLateral /></Ancla>
        <Ancla id="efecto">
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
        </Ancla>
      </>
    ),
    idioma: (
      <>
        <Ancla id="idioma">
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
        </Ancla>
        <Ancla id="formato-hora"><AjusteFormatoHora /></Ancla>
        <Ancla id="inicio-semana"><AjusteInicioSemana /></Ancla>
      </>
    ),
    avisos: (
      <>
        <Ancla id="aviso-clase">
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
        </Ancla>
        <Ancla id="aviso-evento">
          <TarjetaAjuste glifo="calendario" titulo={t("Avisar antes de un evento con hora")} descripcion={t("Para un examen a las 8:30 o una cita a las 4: una notificación unos minutos antes de que empiece.")}>
            <Selector<number>
              label={t("Avisar antes de un evento con hora")}
              value={a.avisoEventoMin}
              options={[
                { value: 0, label: t("No avisar") },
                { value: 10, label: t("10 minutos antes") },
                { value: 15, label: t("15 minutos antes") },
                { value: 30, label: t("30 minutos antes") },
                { value: 60, label: t("1 hora antes") },
                { value: 120, label: t("2 horas antes") },
              ]}
              onChange={(avisoEventoMin) => a.cambiar({ avisoEventoMin })}
            />
          </TarjetaAjuste>
        </Ancla>
        <Ancla id="resumen-dia">
          <TarjetaAjuste glifo="calendario" titulo={t("Resumen del día")} descripcion={t("Al empezar el día, una notificación con tus clases, tareas y cumpleaños de hoy.")}>
            <div className="flex items-center gap-3">
              {a.resumenDia && (
                <Selector<number>
                  label={t("Hora del resumen")}
                  value={a.resumenHora}
                  options={Array.from({ length: 14 }, (_, h) => ({ value: h, label: enPunto(h) }))}
                  onChange={(resumenHora) => a.cambiar({ resumenHora })}
                />
              )}
              <Switch checked={a.resumenDia} onChange={(v) => a.cambiar({ resumenDia: v })} label={t("Resumen del día")} />
            </div>
          </TarjetaAjuste>
        </Ancla>
        <Ancla id="sonido"><AjusteSonidoAvisos /></Ancla>
        <Ancla id="no-molestar"><AjusteNoMolestar /></Ancla>
        <Ancla id="aviso-cancion">
          <TarjetaAjuste glifo="campana" titulo={t("Avisar qué canción suena")} descripcion={t("Una notificación del sistema cada vez que empieza una canción nueva.")}>
            <Switch checked={a.avisarCambioCancion} onChange={(v) => a.cambiar({ avisarCambioCancion: v })} label={t("Avisar qué canción suena")} />
          </TarjetaAjuste>
        </Ancla>
        <Ancla id="cumpleanos">
          <TarjetaAjuste glifo="campana" titulo={t("Avisos de cumpleaños")} descripcion={t("Cuándo avisar, a qué hora y el permiso de notificaciones se eligen en el propio calendario.")}>
            <Link href="/calendario" className="rounded-control inline-flex h-8 items-center border border-stroke bg-layer-alt px-4 text-body text-fg shadow-card transition-colors duration-exit ease-fluent hover:bg-layer">
              {t("Abrir el calendario")}
            </Link>
          </TarjetaAjuste>
        </Ancla>
        <Ancla id="probar-aviso">
          <TarjetaAjuste glifo="informacion" titulo={t("Probar una notificación")} descripcion={t("Para comprobar que Windows te las muestra. Avisan mientras Nexo esté abierto, aunque sea en la bandeja.")}>
            <Button onClick={() => void notificarSistema("Nexo", t("Así se verán tus avisos de clases y tareas. Al pulsarlo vuelves a Configuración."), "prueba", rutaAjustes("avisos"), { ignorarSilencio: true })}>{t("Enviar aviso de prueba")}</Button>
          </TarjetaAjuste>
        </Ancla>
      </>
    ),
    reproduccion: (
      <>
        <Ancla id="volumen">
          <TarjetaAjuste glifo="volumen" titulo={t("Volumen predeterminado")} descripcion={t("Con el que empieza a sonar todo al abrir Nexo.")}>
            <div className="flex w-[260px] items-center gap-3">
              <Slider label={t("Volumen predeterminado")} value={a.volumenPorDefecto} max={100} valueText={`${a.volumenPorDefecto} %`} onCommit={(v) => a.cambiar({ volumenPorDefecto: v })} onChange={(v) => a.cambiar({ volumenPorDefecto: v })} />
              <span className="tabular w-10 text-right text-caption text-fg-secondary">{a.volumenPorDefecto} %</span>
            </div>
          </TarjetaAjuste>
        </Ancla>
        <Ancla id="autoplay">
          <TarjetaAjuste glifo="reproducir" titulo={t("Reproducción automática")} descripcion={t("Al abrir un enlace directo a un video, empieza a reproducirse solo.")}>
            <Switch checked={a.reproduccionAutomatica} onChange={(v) => a.cambiar({ reproduccionAutomatica: v })} label={t("Reproducción automática")} />
          </TarjetaAjuste>
        </Ancla>
        <Ancla id="similares">
          <TarjetaAjuste glifo="musica" titulo={t("Música sin parar (como Spotify)")} descripcion={t("Con Spotify conectado, al elegir una canción la música sigue sola con canciones parecidas, sin tener que armar una lista. Apágalo si prefieres que se detenga al terminar.")}>
            <Switch checked={a.seguirConSimilares} onChange={(v) => a.cambiar({ seguirConSimilares: v })} label={t("Música sin parar")} />
          </TarjetaAjuste>
        </Ancla>
        <Ancla id="canales"><AjusteCanales /></Ancla>
      </>
    ),
    documentos: (
      <>
        <Ancla id="office">{escritorio && <AjusteOffice />}</Ancla>
        <Ancla id="buscar-en-archivos">{escritorio && <AjusteIndicePdfs />}</Ancla>
        <Ancla id="donde-guardar">
          {escritorio && (
            <TarjetaAjuste glifo="carpeta" titulo={t("Elegir dónde guardar")} descripcion={t("Al descargar un resultado se abre «Guardar como», empezando en la carpeta de tus materias (Documentos/Nexo/Tareas). Si lo apagas, se guarda directo en Descargas.")}>
              <Switch checked={a.preguntarDondeGuardar} onChange={(v) => a.cambiar({ preguntarDondeGuardar: v })} label={t("Elegir dónde guardar")} />
            </TarjetaAjuste>
          )}
        </Ancla>
        <Ancla id="al-terminar">
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
        </Ancla>
      </>
    ),
    sistema: (
      <>
        <Ancla id="pantalla-inicial">
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
        </Ancla>
        <Ancla id="inicio-windows">{escritorio && <AjusteInicioAutomatico />}</Ancla>
        <Ancla id="bandeja">
          {escritorio && (
            <TarjetaAjuste glifo="pantalla" titulo={t("Seguir sonando en la bandeja")} descripcion={t("Al cerrar la ventana, Nexo se oculta a la bandeja del sistema en vez de cerrarse. «Salir» en su menú lo cierra de verdad.")}>
              <Switch checked={a.segundoPlano} onChange={(v) => a.cambiar({ segundoPlano: v })} label={t("Seguir sonando en la bandeja")} />
            </TarjetaAjuste>
          )}
        </Ancla>
        <Ancla id="bajo-consumo"><AjusteBajoConsumo /></Ancla>
      </>
    ),
    datos: (
      <>
        <Ancla id="guardar-copia"><AjusteCopiaSeguridad /></Ancla>
        <Ancla id="restablecer">
          <TarjetaAjuste glifo="actualizar" titulo={t("Restablecer valores")} descripcion={t("Regresa todos los ajustes de Configuración a como venían. Tu perfil, tu horario y tus datos no se tocan.")}>
            <Button onClick={() => setRestablecer(true)}>{t("Restablecer")}</Button>
          </TarjetaAjuste>
        </Ancla>
      </>
    ),
    acerca: (
      <>
        <Ancla id="ayuda"><AjusteAyuda /></Ancla>
        <Ancla id="primeros-pasos"><AjustePrimerosPasos /></Ancla>
        <Ancla id="consejos"><AjusteConsejos /></Ancla>
        <Ancla id="bienvenida">
          <TarjetaAjuste glifo="informacion" titulo={t("Bienvenida y guías")} descripcion={t("Vuelve a ver la bienvenida. Cada sección tiene además su propia guía: pulsa el signo de interrogación (?) de la barra de arriba.")}>
            <Button onClick={() => useGuiasStore.getState().abrir("bienvenida")}>{t("Ver de nuevo")}</Button>
          </TarjetaAjuste>
        </Ancla>
        <Ancla id="actualizaciones"><AjusteActualizaciones /></Ancla>
        <Ancla id="novedades">
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
        </Ancla>
        <Ancla id="acerca-de">
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
        </Ancla>
      </>
    ),
  };

  return (
    <>
      <PlantillaPagina
        migas={[{ etiqueta: "Configuración", href: "/configuracion" }, { etiqueta: activa.titulo }]}
        titulo={t(activa.titulo)}
        descripcion={t(activa.descripcion)}
        principal={
          <div className="flex max-w-[900px] flex-col gap-1">
            <AjusteResaltado categoria={activa.id} ajuste={parametros.get("ajuste")}>
              {paneles[activa.id]}
            </AjusteResaltado>
          </div>
        }
      />

      <DialogoPerfil abierto={perfil} onCerrar={() => setPerfil(false)} />
      <Dialog open={restablecer} onClose={() => setRestablecer(false)} title={t("Restablecer valores")} maxWidth={440}>
        <p className="text-body text-fg-secondary">{t("Tema, acento, efecto, volumen y demás ajustes de Configuración vuelven a sus valores de fábrica. Tu perfil, tus canales y tus cumpleaños no se tocan.")}</p>
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
