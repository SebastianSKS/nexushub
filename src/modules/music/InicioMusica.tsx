"use client";

import { useT, useIdioma, traducir } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart20Filled, Library20Regular } from "@fluentui/react-icons";
import { rutaLista } from "@/lib/rutas";
import { cargarMixes, iniciarMix, type Mix } from "@/services/music/mixes";
import { avisoBreve } from "@/services/music/megusta";
import { useMusicStore } from "@/store/music-store";
import { usePerfilStore } from "@/store/perfil-store";

function saludo(): string {
  const h = new Date().getHours();
  return h < 6 ? traducir("Buenas noches") : h < 12 ? traducir("Buenos días") : h < 19 ? traducir("Buenas tardes") : traducir("Buenas noches");
}

const TILE = "rounded-control reveal group relative flex h-14 items-center gap-3 overflow-hidden border border-stroke bg-layer pr-3 text-left shadow-card transition-colors duration-exit ease-fluent hover:bg-layer-alt";

/** Lo primero de Música con la cuenta conectada: saludo, accesos rápidos a lo tuyo y «Tus mixes». */
export function InicioMusica() {
  const t = useT();
  const idioma = useIdioma();
  const nombrePerfil = usePerfilStore((s) => s.nombre);
  const conexion = useMusicStore((s) => s.connection);
  const playlists = useMusicStore((s) => s.playlists);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [saludoHoy, setSaludoHoy] = useState(""); // se calcula tras montar: la hora de la exportación no es la del equipo
  const [iniciando, setIniciando] = useState<number | null>(null);

  useEffect(() => setSaludoHoy(saludo()), [idioma]);
  const refrescos = useMusicStore((s) => s.refrescos);
  useEffect(() => {
    let cancelado = false;
    void cargarMixes(5, refrescos > 0).then((m) => !cancelado && setMixes(m));
    return () => {
      cancelado = true;
    };
  }, [refrescos]);

  const nombre = nombrePerfil ?? (conexion.status === "connected" ? conexion.name : null);
  const tiles = useMemo(() => playlists.slice(0, 5), [playlists]);

  const empezar = async (m: Mix) => {
    setIniciando(m.n);
    const ok = await iniciarMix(m).catch(() => false);
    setIniciando(null);
    if (!ok) avisoBreve(t("No se pudo empezar el mix"), t("Inténtalo de nuevo en un momento."));
  };

  return (
    <section aria-label={t("Para ti")} className="flex flex-col gap-6">
      <div>
        <h2 className="text-subtitle text-fg">{saludoHoy ? `${saludoHoy}${nombre ? `, ${nombre}` : ""}` : " "}</h2>
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
          <Link href="/musica/me-gusta" className={TILE}>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center text-white" style={{ backgroundImage: "linear-gradient(135deg, #4b2cff, #a8c0ff)" }} aria-hidden>
              <Heart20Filled />
            </span>
            <span className="min-w-0 truncate text-body font-semibold text-fg">{t("Canciones que te gustan")}</span>
          </Link>
          {tiles.map((p) => (
            <Link key={p.id} href={rutaLista(p.id, "playlist")} className={TILE}>
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- carátula remota
                <img src={p.image} alt="" width={56} height={56} className="h-14 w-14 shrink-0 object-cover" />
              ) : (
                <span className="h-14 w-14 shrink-0 bg-layer-alt" aria-hidden />
              )}
              <span className="min-w-0 truncate text-body font-semibold text-fg">{p.name}</span>
            </Link>
          ))}
          <Link href="/musica/biblioteca" className={TILE}>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-layer-alt text-accent-text" aria-hidden>
              <Library20Regular />
            </span>
            <span className="min-w-0 truncate text-body font-semibold text-fg">{t("Tu biblioteca")}</span>
          </Link>
        </div>
      </div>

      {mixes.length > 0 && (
        <div>
          <h2 className="mb-3 text-subtitle text-fg">{t("Tus mixes")}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {mixes.map((m) => (
              <button
                key={m.n}
                type="button"
                onClick={() => void empezar(m)}
                disabled={iniciando !== null}
                aria-label={t("Reproducir Mix {n}, basado en {artista}", { n: m.n, artista: m.artista })}
                className="rounded-control reveal group relative flex aspect-square flex-col justify-between overflow-hidden p-3 text-left text-white shadow-card transition-transform duration-enter ease-fluent hover:scale-[1.02] disabled:opacity-60"
                style={{ backgroundImage: `linear-gradient(150deg, ${m.color}, #111 95%)` }}
              >
                <span className="text-body font-bold">{t("Mix {n}", { n: m.n })}</span>
                {m.imagen && (
                  // eslint-disable-next-line @next/next/no-img-element -- foto remota del artista
                  <img src={m.imagen} alt="" className="absolute -bottom-4 -right-4 h-[52%] w-[52%] rounded-full object-cover opacity-90 shadow-flyout" draggable={false} />
                )}
                <span className="relative z-10 max-w-[58%] text-caption font-semibold leading-tight drop-shadow">{iniciando === m.n ? t("Preparando…") : t("Con {artista} y música parecida", { artista: m.artista })}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
