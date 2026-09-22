import { SECCIONES_PRINCIPALES } from "@/lib/rutas";
import { normalize } from "@/lib/text";
import type { Command } from "@/types";

export { normalize };

/** Construye la lista de comandos. `ir` navega a una ruta (router.push): la URL es la fuente de verdad. */
export function buildCommands(query: string, ir: (ruta: string) => void): Command[] {
  const text = query.trim();

  const navigation: Command[] = SECCIONES_PRINCIPALES.map((s) => ({
    id: `go-${s.id}`,
    label: `Ir a ${s.etiqueta}`,
    keywords: [s.etiqueta, s.id, "abrir", "navegar"],
    shortcut: ["Ctrl", s.atajo!],
    group: "Navegación",
    run: () => ir(s.ruta),
  }));

  // Con texto escrito se ofrece buscarlo como música (Spotify). No hay "buscar en YouTube": Video
  // funciona con los canales que sigues, y su propio campo filtra sus videos.
  const search: Command[] = text
    ? [
        {
          id: "search-music",
          label: `Buscar «${text}» en Música`,
          hint: "Spotify",
          keywords: [],
          group: "Buscar",
          run: () => ir(`/musica?q=${encodeURIComponent(text)}`),
        },
      ]
    : [];

  return [
    ...navigation,
    ...search,
    {
      id: "settings",
      label: "Abrir Configuración",
      keywords: ["ajustes", "tema", "apariencia", "acento", "configuracion"],
      group: "Ayuda",
      run: () => ir("/configuracion"),
    },
    {
      id: "show-shortcuts",
      label: "Mostrar atajos de teclado",
      keywords: ["ayuda", "teclas", "atajos", "shortcuts"],
      shortcut: ["?"],
      group: "Ayuda",
      run: () => ir("/atajos"),
    },
  ];
}

export function filterCommands(commands: Command[], query: string): Command[] {
  const q = normalize(query.trim());
  if (!q) return commands;
  return commands.filter((c) => [c.label, ...c.keywords].some((t) => normalize(t).includes(q)));
}
