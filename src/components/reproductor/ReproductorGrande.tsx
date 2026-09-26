"use client";

import { useT } from "@/lib/i18n";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Glifo } from "@/components/fluent/Glifo";
import { IconButton } from "@/components/fluent/IconButton";
import { Slider } from "@/components/fluent/Slider";
import { ENTER, EXIT } from "@/lib/motion";
import { formatDuration } from "@/lib/video/format";
import { useColorCaratula } from "@/hooks/useColorCaratula";
import { useProgreso } from "@/hooks/useProgreso";
import { rutaArtista } from "@/lib/rutas";
import { useAppStore } from "@/store/app-store";
import { useFavoritosStore } from "@/store/favoritos-store";
import { alternarMeGusta, esMeGusta } from "@/services/music/megusta";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore } from "@/store/reproductor-store";
import { EcualizadorVisual } from "./EcualizadorVisual";
import { PanelLetra } from "./PanelLetra";

/** Vista grande "Reproduciendo ahora": carátula grande, controles y favorito, a pantalla completa. */
export function ReproductorGrande() {
  const t = useT();
  const abierto = useAppStore((s) => s.reproductorGrandeAbierto);
  const cerrar = () => useAppStore.getState().setReproductorGrandeAbierto(false);
  const pista = useReproductorStore((s) => s.pista);
  const reproduciendo = useReproductorStore((s) => s.reproduciendo);
  const capacidades = useReproductorStore((s) => s.capacidades);
  const cola = useReproductorStore((s) => s.cola);
  const volumen = useReproductorStore((s) => s.volumen);
  const todosFavoritos = useFavoritosStore((s) => s.favoritos);
  const meGusta = useMusicStore((s) => s.meGusta);
  const favorito = pista ? esMeGusta(pista, todosFavoritos, meGusta) : false;
  const progreso = useProgreso();
  const st = useReproductorStore.getState;
  const router = useRouter();
  const mostrarLetra = useAppStore((s) => s.mostrarLetra);
  const color = useColorCaratula(pista?.caratula ?? "");
  const conLetra = mostrarLetra && pista?.fuente === "spotify";

  // Se cierra sola si la pista termina (cerrar/cambiar de fuente) para no quedar mostrando nada.
  useEffect(() => {
    if (!pista && abierto) cerrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pista, abierto]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto]);

  if (!pista) return null;
  const puedeSaltar = capacidades.saltar || cola.length > 1;
  const duracion = pista.duracion;

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={t("Reproduciendo ahora")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: ENTER }}
          exit={{ opacity: 0, transition: EXIT }}
          className="fixed inset-0 z-[55] flex items-center justify-center overflow-hidden p-6"
          onMouseDown={(e) => e.target === e.currentTarget && cerrar()}
        >
          <div className="absolute inset-0 -z-10 bg-[#0b0b0c]" aria-hidden>
            {pista.caratula && (
              // eslint-disable-next-line @next/next/no-img-element -- fondo decorativo, difuminado
              <img src={pista.caratula} alt="" className="h-full w-full scale-110 object-cover opacity-40 blur-[80px]" />
            )}
            {/* El color de la carátula tiñe el fondo, como en Spotify. */}
            <div
              className="absolute inset-0 transition-colors duration-[900ms]"
              style={{ backgroundImage: color ? `linear-gradient(160deg, rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.75) 0%, rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.25) 45%, #0b0b0c 100%)` : undefined }}
            />
          </div>

          <IconButton label={t("Cerrar")} onClick={cerrar} className="absolute right-4 top-4 h-9 w-9 text-white hover:bg-white/10">
            <Glifo nombre="cerrar" tam={14} />
          </IconButton>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: ENTER }}
            exit={{ opacity: 0, y: 8, transition: EXIT }}
            className={clsx("flex w-full items-center justify-center gap-10", conLetra ? "max-w-[1040px] flex-col md:flex-row" : "max-w-[420px]")}
          >
            <div className="flex w-full max-w-[420px] shrink-0 flex-col items-center gap-6">
            {pista.caratula ? (
              // eslint-disable-next-line @next/next/no-img-element -- carátula grande
              <img src={pista.caratula} alt="" className="aspect-square w-full max-w-[320px] rounded-[12px] object-cover shadow-dialog" draggable={false} />
            ) : (
              <div className="flex aspect-square w-full max-w-[320px] items-center justify-center rounded-[12px] bg-white/10 shadow-dialog">
                <Glifo nombre="musica" tam={48} className="text-white/60" />
              </div>
            )}

            <div className="flex w-full items-center gap-3">
              <div className="min-w-0 flex-1 text-center">
                <h2 className="truncate text-subtitle font-semibold text-white">{pista.titulo}</h2>
                <p className="truncate text-body text-white/70">{pista.artista}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <EcualizadorVisual activo={reproduciendo} />
              <IconButton
                label={favorito ? t("Quitar de favoritos") : t("Añadir a favoritos")}
                onClick={() => void (pista.fuente === "spotify" ? alternarMeGusta(pista) : useFavoritosStore.getState().alternarFavorito(pista))}
                className={favorito ? "text-accent-text hover:bg-white/10" : "text-white hover:bg-white/10"}
              >
                <Glifo nombre={favorito ? "favoritoLleno" : "favorito"} tam={16} />
              </IconButton>
            </div>

            <div className="flex w-full items-center gap-2 text-caption text-white/70">
              <span className="tabular w-10 text-right">{formatDuration(progreso)}</span>
              <div className="min-w-0 flex-1">
                <Slider
                  label={t("Posición de la canción")}
                  value={Math.min(progreso, duracion || progreso)}
                  max={Math.max(duracion, 1)}
                  disabled={!capacidades.buscar || duracion <= 0}
                  valueText={t("{a} de {b}", { a: formatDuration(progreso), b: formatDuration(duracion) })}
                  onCommit={(v) => st().buscar(v)}
                />
              </div>
              <span className="tabular w-10">{duracion > 0 ? formatDuration(duracion) : "--:--"}</span>
            </div>

            <div className="flex items-center gap-4">
              {puedeSaltar && (
                <IconButton label={t("Anterior")} onClick={() => st().anterior()} className="h-10 w-10 text-white hover:bg-white/10">
                  <Glifo nombre="anterior" tam={18} />
                </IconButton>
              )}
              <button
                type="button"
                onClick={() => st().alternar()}
                aria-label={reproduciendo ? t("Pausar") : t("Reproducir")}
                title={reproduciendo ? t("Pausar") : t("Reproducir")}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-on shadow-flyout transition-colors duration-exit ease-fluent hover:bg-accent-hover active:bg-accent-pressed"
              >
                <Glifo nombre={reproduciendo ? "pausar" : "reproducir"} tam={24} />
              </button>
              {puedeSaltar && (
                <IconButton label={t("Siguiente")} onClick={() => st().siguiente()} className="h-10 w-10 text-white hover:bg-white/10">
                  <Glifo nombre="siguiente" tam={18} />
                </IconButton>
              )}
            </div>

            {capacidades.volumen && (
              <div className="flex w-full max-w-[220px] items-center gap-2 text-white/70">
                <Glifo nombre="volumen" tam={14} />
                <div className="min-w-0 flex-1">
                  <Slider label={t("Volumen")} value={volumen} max={100} valueText={`${Math.round(volumen)} %`} onCommit={(v) => st().setVolumen(v)} onChange={(v) => st().setVolumen(v)} />
                </div>
              </div>
            )}

            {pista.fuente === "spotify" && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => useAppStore.getState().setMostrarLetra(!mostrarLetra)}
                  aria-pressed={mostrarLetra}
                  className={clsx("rounded-control h-8 px-3 text-body transition-colors duration-exit ease-fluent", mostrarLetra ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20")}
                >
                  {t("Letra")}
                </button>
                {pista.artistId && (
                  <button
                    type="button"
                    onClick={() => {
                      useAppStore.getState().setReproductorGrandeAbierto(false);
                      router.push(rutaArtista(pista.artistId!));
                    }}
                    className="rounded-control h-8 bg-white/10 px-3 text-body text-white transition-colors duration-exit ease-fluent hover:bg-white/20"
                  >
                    {t("Ver artista")}
                  </button>
                )}
              </div>
            )}
            </div>

            {conLetra && (
              <div className="h-[min(70vh,640px)] w-full min-w-0 flex-1 md:max-w-[560px]">
                <PanelLetra pista={pista} />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
