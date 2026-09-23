"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search20Regular } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { useMusicStore } from "@/store/music-store";

/** Espera tras la última tecla antes de buscar: lo bastante corto para sentirse instantáneo, sin una petición por letra. */
const ESPERA_MS = 300;

/**
 * Buscador del módulo. Busca MIENTRAS SE ESCRIBE (como en Spotify): con dos letras ya salen resultados, y al
 * borrar el texto vuelven las sugerencias. También acepta un enlace de Spotify (lo resuelve) y Enter.
 */
export function MusicSearchBar() {
  const stored = useMusicStore((s) => s.query);
  const searchAvailable = useMusicStore((s) => s.connection.status === "connected");
  const [text, setText] = useState(stored);
  const ultimo = useRef(stored);

  // Si la búsqueda cambia desde fuera (buscador global, «Ver sugeridos»), el campo la refleja.
  useEffect(() => {
    if (stored !== ultimo.current) {
      ultimo.current = stored;
      setText(stored);
    }
  }, [stored]);

  // Búsqueda en vivo con espera: solo se lanza la última cosa escrita.
  useEffect(() => {
    const q = text.trim();
    if (q === ultimo.current.trim()) return;
    if (q.length === 1) return; // con una sola letra aún no hay nada útil que buscar
    const t = setTimeout(() => {
      ultimo.current = q;
      void useMusicStore.getState().load(q);
    }, ESPERA_MS);
    return () => clearTimeout(t);
  }, [text]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    ultimo.current = q;
    void useMusicStore.getState().load(q);
  };

  return (
    <form onSubmit={submit} role="search" aria-label="Buscar música" className="flex w-[min(520px,100%)] gap-2">
      <div className="relative flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-input border border-stroke bg-layer-alt after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:scale-x-0 after:bg-accent after:transition-transform after:duration-enter after:ease-fluent focus-within:after:scale-x-100">
        <Search20Regular className="ml-3 shrink-0 text-fg-tertiary" aria-hidden />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={searchAvailable ? "Busca canciones, artistas o álbumes" : "Filtrar sugeridos o pegar un enlace de Spotify"}
          aria-label="Buscar música o pegar un enlace de Spotify"
          autoComplete="off"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-body text-fg placeholder:text-fg-tertiary focus-visible:outline-none"
        />
      </div>
      <Button type="submit" className="h-9">
        Buscar
      </Button>
    </form>
  );
}
