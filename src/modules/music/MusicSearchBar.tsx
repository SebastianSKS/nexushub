"use client";

import { useT, T } from "@/lib/i18n";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search20Regular } from "@fluentui/react-icons";
import clsx from "clsx";
import { Button } from "@/components/fluent/Button";
import { rutaLista } from "@/lib/rutas";
import { sugerirBusqueda } from "@/services/music/catalogo";
import { pistaDeItem } from "@/services/music/lista";
import { useMusicStore } from "@/store/music-store";
import { useReproductorStore } from "@/store/reproductor-store";
import type { MusicItem } from "@/types/music";

/** Espera tras la última tecla antes de pedir sugerencias: sin una petición por letra. */
const ESPERA_MS = 250;

const ETIQUETA: Record<MusicItem["kind"], string> = { track: T("Canción"), artist: T("Artista"), album: T("Álbum"), playlist: T("Playlist") };

/**
 * Buscador del módulo, como el de Spotify: al escribir se abre debajo una lista con lo que mejor coincide (canciones,
 * artistas, álbumes, playlists) para elegir directamente, sin bajar por la página. Con Enter o «Buscar» se ven todos
 * los resultados. También acepta un enlace de Spotify (lo resuelve).
 */
export function MusicSearchBar() {
  const t = useT();
  const router = useRouter();
  const stored = useMusicStore((s) => s.query);
  const searchAvailable = useMusicStore((s) => s.connection.status === "connected");
  const [text, setText] = useState(stored);
  const ultimo = useRef(stored);
  const contenedor = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [sugerencias, setSugerencias] = useState<MusicItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [activo, setActivo] = useState(-1);
  const seq = useRef(0);

  // Si la búsqueda cambia desde fuera (buscador global, «Ver sugeridos»), el campo la refleja.
  useEffect(() => {
    if (stored !== ultimo.current) {
      ultimo.current = stored;
      setText(stored);
    }
  }, [stored]);

  // Sugerencias mientras se escribe (con espera); solo cuenta la última petición.
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2 || q === ultimo.current.trim()) {
      setSugerencias([]);
      setCargando(false);
      return;
    }
    const mio = ++seq.current;
    setCargando(true);
    const espera = setTimeout(() => {
      sugerirBusqueda(q, searchAvailable)
        .then((items) => {
          if (mio !== seq.current) return;
          setSugerencias(items);
          setActivo(-1);
        })
        .catch(() => mio === seq.current && setSugerencias([]))
        .finally(() => mio === seq.current && setCargando(false));
    }, ESPERA_MS);
    return () => clearTimeout(espera);
  }, [text, searchAvailable]);

  // Al vaciar el campo vuelven las sugerencias de inicio.
  useEffect(() => {
    if (text.trim() === "" && ultimo.current.trim() !== "") {
      ultimo.current = "";
      void useMusicStore.getState().load("");
    }
  }, [text]);

  // Clic fuera: se cierra la lista.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const buscarTodo = () => {
    const q = text.trim();
    ultimo.current = q;
    setAbierto(false);
    setSugerencias([]);
    void useMusicStore.getState().load(q);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (activo >= 0 && sugerencias[activo]) elegir(sugerencias[activo]!);
    else buscarTodo();
  };

  const elegir = (item: MusicItem) => {
    setAbierto(false);
    if (item.kind === "track") useReproductorStore.getState().reproducir(pistaDeItem(item));
    else router.push(rutaLista(item.id, item.kind));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setAbierto(false);
    else if (e.key === "ArrowDown" && sugerencias.length > 0) {
      e.preventDefault();
      setAbierto(true);
      setActivo((a) => (a + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp" && sugerencias.length > 0) {
      e.preventDefault();
      setActivo((a) => (a <= 0 ? sugerencias.length - 1 : a - 1));
    }
  };

  const mostrar = abierto && text.trim().length >= 2 && (sugerencias.length > 0 || cargando);

  return (
    <div ref={contenedor} className="relative w-[min(520px,100%)]">
      <form onSubmit={submit} role="search" aria-label={t("Buscar música")} className="flex w-full gap-2">
        <div className="relative flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-input border border-stroke bg-layer-alt after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:scale-x-0 after:bg-accent after:transition-transform after:duration-enter after:ease-fluent focus-within:after:scale-x-100">
          <Search20Regular className="ml-3 shrink-0 text-fg-tertiary" aria-hidden />
          <input
            type="search"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            onKeyDown={onKeyDown}
            placeholder={searchAvailable ? t("Busca canciones, artistas, álbumes o playlists") : t("Filtrar sugeridos o pegar un enlace de Spotify")}
            aria-label={t("Buscar música o pegar un enlace de Spotify")}
            aria-expanded={mostrar}
            aria-controls="sugerencias-musica"
            autoComplete="off"
            spellCheck={false}
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-body text-fg placeholder:text-fg-tertiary focus-visible:outline-none"
          />
        </div>
        <Button type="submit" className="h-9">
          {t("Buscar")}
        </Button>
      </form>

      {mostrar && (
        <div
          id="sugerencias-musica"
          role="listbox"
          aria-label={t("Sugerencias de búsqueda")}
          onMouseDown={(e) => e.preventDefault()}
          style={{ backgroundColor: "var(--mica-base)" }}
          className="absolute left-0 top-full z-40 mt-1 w-full overflow-hidden rounded-[8px] border border-stroke-strong p-1 shadow-flyout"
        >
          {sugerencias.length === 0 ? (
            <p className="px-3 py-2 text-caption text-fg-secondary" role="status">
              {t("Buscando…")}
            </p>
          ) : (
            <>
              <ul className="max-h-[min(420px,60vh)] overflow-y-auto">
                {sugerencias.map((item, i) => (
                  <li key={`${item.kind}:${item.id}`} role="option" aria-selected={i === activo}>
                    <button
                      type="button"
                      onClick={() => elegir(item)}
                      onMouseEnter={() => setActivo(i)}
                      className={clsx("flex h-14 w-full items-center gap-3 rounded-control px-2 text-left transition-colors duration-exit ease-fluent", i === activo ? "bg-layer-alt" : "hover:bg-layer-alt")}
                    >
                      {item.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element -- carátula remota
                        <img src={item.cover} alt="" width={40} height={40} className={clsx("h-10 w-10 shrink-0 object-cover", item.kind === "artist" ? "rounded-full" : "rounded-[4px]")} draggable={false} />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-[4px] bg-layer" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-semibold text-fg">{item.title}</span>
                        <span className="block truncate text-caption text-fg-secondary">{item.kind === "track" ? `${t(ETIQUETA.track)} · ${t(item.subtitle)}` : t(item.subtitle).startsWith(t(ETIQUETA[item.kind])) ? t(item.subtitle) : `${t(ETIQUETA[item.kind])} · ${t(item.subtitle)}`}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={buscarTodo} className="mt-1 flex h-10 w-full items-center gap-2 rounded-control border-t border-stroke px-3 text-left text-body text-accent-text hover:bg-layer-alt">
                <Search20Regular aria-hidden />
                <span className="truncate">{t("Ver todos los resultados de «{texto}»", { texto: text.trim() })}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
