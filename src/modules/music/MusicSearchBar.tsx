"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Search20Regular } from "@fluentui/react-icons";
import { Button } from "@/components/fluent/Button";
import { useMusicStore } from "@/store/music-store";

/** Buscador del módulo. Acepta texto (busca o filtra) o un enlace de Spotify (lo resuelve). */
export function MusicSearchBar() {
  const stored = useMusicStore((s) => s.query);
  const searchAvailable = useMusicStore((s) => s.connection.status === "connected");
  const [text, setText] = useState(stored);
  useEffect(() => setText(stored), [stored]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void useMusicStore.getState().load(text.trim());
  };

  return (
    <form onSubmit={submit} role="search" aria-label="Buscar música" className="flex w-[min(460px,100%)] gap-2">
      <div className="relative flex h-8 min-w-0 flex-1 items-center overflow-hidden rounded-input border border-stroke bg-layer-alt after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:scale-x-0 after:bg-accent after:transition-transform after:duration-enter after:ease-fluent focus-within:after:scale-x-100">
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={searchAvailable ? "Buscar canciones o pegar un enlace" : "Filtrar sugeridos o pegar un enlace de Spotify"}
          aria-label="Buscar música o pegar un enlace de Spotify"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-body text-fg placeholder:text-fg-tertiary focus-visible:outline-none"
        />
      </div>
      <Button type="submit" icon={<Search20Regular />}>
        Buscar
      </Button>
    </form>
  );
}
