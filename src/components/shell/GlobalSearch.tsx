"use client";

import { useT, useIdioma } from "@/lib/i18n";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Search20Regular } from "@fluentui/react-icons";
import { useRouter } from "next/navigation";
import { Glifo } from "@/components/fluent/Glifo";
import { LogoMarca } from "@/components/fluent/LogoMarca";
import { prepararBusqueda, buscarContenido } from "@/lib/busqueda";
import { buildCommands, filterCommands } from "@/lib/commands";
import { ENTER, EXIT } from "@/lib/motion";
import { plegar } from "@/lib/text";
import { cargarIconosProgramas } from "@/services/iconos-programas";
import { sincronizarIndice, useIndicePdfs } from "@/services/indice-pdfs";
import { useAppStore } from "@/store/app-store";
import { useCanalesStore } from "@/store/canales-store";
import { useCalendarioStore } from "@/store/calendario-store";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useHorarioStore } from "@/store/horario-store";
import { useNotasStore } from "@/store/notas-store";
import type { Command } from "@/types";

/**
 * Buscador global (Ctrl+K o clic en la barra). Busca en TODO Nexo —tareas y eventos, clases del horario,
 * cumpleaños, apuntes, canales y sus videos, favoritos y herramientas de Documentos— y además ofrece los
 * comandos de siempre (ir a una sección, abrir Configuración…). Si escribes una cuenta, la resuelve.
 */
/** Un número que cambia cuando cambia algo que el buscador lee (para volver a buscar con datos frescos). */
function useDatosBuscables(): string {
  const eventos = useCalendarioStore((s) => s.eventos);
  const amigos = useCalendarioStore((s) => s.amigos);
  const notas = useNotasStore((s) => s.notas);
  const clases = useHorarioStore((s) => s.clases);
  const favoritos = useFavoritosStore((s) => s.favoritos);
  const canales = useCanalesStore((s) => s.canales);
  const feeds = useCanalesStore((s) => s.feeds);
  const indicePdfs = useIndicePdfs((s) => s.version);
  return [indicePdfs, eventos.length, amigos.length, notas.length, clases.length, favoritos.length, canales.length, Object.keys(feeds).length, Object.values(feeds).reduce((n, f) => n + f.videos.length, 0)].join("-");
}

/** El fragmento de un PDF, con las palabras buscadas resaltadas (funciona igual con o sin acentos: el texto plegado mide lo mismo). */
function Resaltado({ texto, palabras }: { texto: string; palabras?: string[] }) {
  const partes = useMemo(() => {
    const ps = (palabras ?? []).map(plegar).filter(Boolean);
    if (ps.length === 0) return [{ t: texto, marca: false }];
    const plano = plegar(texto);
    const marcas = new Array<boolean>(texto.length).fill(false);
    for (const p of ps) for (let i = plano.indexOf(p); i !== -1; i = plano.indexOf(p, i + p.length)) marcas.fill(true, i, i + p.length);
    const salida: { t: string; marca: boolean }[] = [];
    let ini = 0;
    for (let i = 1; i <= texto.length; i++) {
      if (i === texto.length || marcas[i] !== marcas[ini]) {
        salida.push({ t: texto.slice(ini, i), marca: marcas[ini] });
        ini = i;
      }
    }
    return salida;
  }, [texto, palabras]);
  return (
    <span className="mt-0.5 line-clamp-2 text-caption text-fg-secondary">
      {partes.map((p, i) => (p.marca ? <mark key={i} className="rounded-[2px] px-px text-fg" style={{ background: "color-mix(in srgb, var(--accent) 30%, transparent)" }}>{p.t}</mark> : <span key={i}>{p.t}</span>))}
    </span>
  );
}

export function GlobalSearch() {
  const t = useT();
  const idioma = useIdioma();
  const router = useRouter();
  const open = useAppStore((s) => s.searchOpen);
  const setOpen = useAppStore((s) => s.setSearchOpen);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const leyendo = useIndicePdfs((s) => s.fase === "leyendo");
  const hechos = useIndicePdfs((s) => s.hechos);
  const total = useIndicePdfs((s) => s.total);

  // Cambia cuando los datos que se buscan cambian (una tarea nueva, una nota…): así los resultados están al día.
  const version = useDatosBuscables();
  const results = useMemo<Command[]>(() => {
    const ir = (r: string) => router.push(r);
    return [...buscarContenido(query, ir), ...filterCommands(buildCommands(query, ir), query)];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` fuerza a rehacer la búsqueda cuando cambian los datos
  }, [query, router, version, idioma]);

  // Ctrl+K abre el panel desde cualquier parte: enfocar el campo. Al abrirlo se leen los datos que se buscan.
  useEffect(() => {
    if (!open) return;
    if (document.activeElement !== inputRef.current) inputRef.current?.focus();
    prepararBusqueda();
    void cargarIconosProgramas(["pdf"]);
    void sincronizarIndice(30_000); // PDF nuevos que hayas guardado desde la última vez
    useCanalesStore.getState().iniciar(); // los videos de tus canales (usa el caché de 15 min si ya se cargaron)
  }, [open]);

  // Clic fuera cierra
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.blur();
  };

  const run = (cmd: Command) => {
    close();
    cmd.run();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setOpen(true);
        setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
        break;
      case "Enter": {
        const cmd = results[activeIndex];
        if (cmd) {
          e.preventDefault();
          run(cmd);
        }
        break;
      }
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, { cmd: Command; index: number }[]>();
    results.forEach((cmd, index) => {
      const list = map.get(cmd.group) ?? [];
      list.push({ cmd, index });
      map.set(cmd.group, list);
    });
    return [...map.entries()];
  }, [results]);

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div ref={rootRef} className="relative w-[400px] max-w-[38vw]">
      <div
        className={clsx(
          "group relative flex h-7 items-center gap-2 overflow-hidden rounded-input border border-stroke bg-layer-alt px-3",
          "transition-colors duration-exit ease-fluent hover:bg-layer",
          "after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:origin-center after:scale-x-0 after:bg-accent",
          "after:transition-transform after:duration-enter after:ease-fluent focus-within:after:scale-x-100",
        )}
      >
        <Search20Regular className="shrink-0 text-fg-secondary" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={t("Buscador global")}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[activeIndex] ? optionId(activeIndex) : undefined}
          placeholder={t("Buscar en Nexo")}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-body text-fg placeholder:text-fg-tertiary focus-visible:outline-none"
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: ENTER }}
            exit={{ opacity: 0, transition: EXIT }}
            className="acrylic absolute left-0 right-0 top-full z-40 mt-2 max-h-[min(420px,60vh)] overflow-auto rounded-control p-1.5 shadow-flyout"
          >
            <div id={listId} role="listbox" aria-label={t("Resultados")}>
              {groups.length === 0 && (
                <p className="px-3 py-6 text-center text-body text-fg-secondary">
                  {t("No encontré nada para «{query}». Prueba con el nombre de una materia, una tarea, un canal, «documentos» o una palabra que esté dentro de tus PDF.", { query })}
                </p>
              )}
              {groups.map(([group, items]) => (
                <div key={group} role="group" aria-label={group} className="py-1">
                  <div className="px-3 pb-1 pt-1.5 text-caption font-semibold text-fg-tertiary" aria-hidden>
                    {group}
                  </div>
                  {items.map(({ cmd, index }) => (
                    <div
                      key={cmd.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => run(cmd)}
                      className={clsx(
                        "rounded-control flex cursor-default items-center gap-3 px-3 py-2",
                        index === activeIndex ? "bg-layer-alt" : "bg-transparent",
                      )}
                    >
                      {cmd.marca ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
                          <LogoMarca marca={cmd.marca} tam={cmd.marca === "spotify" || cmd.marca === "youtube" ? 20 : 22} />
                        </span>
                      ) : (
                        cmd.icon && (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center" style={{ color: cmd.color }} aria-hidden>
                            <Glifo nombre={cmd.icon} tam={16} />
                          </span>
                        )
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body text-fg">{cmd.label}</span>
                        {cmd.hint && (
                          <span className="block truncate text-caption text-fg-tertiary">{cmd.hint}</span>
                        )}
                        {cmd.detalle && <Resaltado texto={cmd.detalle} palabras={cmd.resaltar} />}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {leyendo && (
              <p className="px-3 pb-1.5 pt-2 text-caption text-fg-tertiary" role="status">
                {t("Leyendo tus PDF para buscar dentro de ellos ({hechos} de {total})… ya puedes seguir buscando.", { hechos, total })}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
