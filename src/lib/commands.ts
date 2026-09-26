import { SECCIONES_PRINCIPALES } from "@/lib/rutas";
import { traducir } from "@/lib/i18n";
import { normalize } from "@/lib/text";
import type { Command } from "@/types";

export { normalize };

/** Construye la lista de comandos. `ir` navega a una ruta (router.push): la URL es la fuente de verdad. */
export function buildCommands(query: string, ir: (ruta: string) => void): Command[] {
  const text = query.trim();

  const navigation: Command[] = SECCIONES_PRINCIPALES.map((s) => ({
    id: `go-${s.id}`,
    label: traducir("Ir a {seccion}", { seccion: traducir(s.etiqueta) }),
    keywords: [s.etiqueta, traducir(s.etiqueta), s.id, "abrir", "navegar", "open", "go"],
    shortcut: ["Ctrl", s.atajo!],
    group: traducir("Navegación"),
    run: () => ir(s.ruta),
  }));

  // Con texto escrito se ofrece buscarlo como música (Spotify). No hay "buscar en YouTube": Video
  // funciona con los canales que sigues, y su propio campo filtra sus videos.
  const search: Command[] = text
    ? [
        {
          id: "search-music",
          label: traducir("Buscar «{texto}» en Música", { texto: text }),
          hint: "Spotify",
          keywords: [],
          group: traducir("Buscar"),
          run: () => ir(`/musica?q=${encodeURIComponent(text)}`),
        },
      ]
    : [];

  return [
    ...navigation,
    ...search,
    {
      id: "settings",
      label: traducir("Abrir Configuración"),
      keywords: ["ajustes", "tema", "apariencia", "acento", "configuracion", "settings", "theme", "language", "idioma"],
      group: traducir("Ayuda"),
      run: () => ir("/configuracion"),
    },
    {
      id: "show-shortcuts",
      label: traducir("Mostrar atajos de teclado"),
      keywords: ["ayuda", "teclas", "atajos", "shortcuts", "keyboard", "help"],
      shortcut: ["?"],
      group: traducir("Ayuda"),
      run: () => ir("/atajos"),
    },
  ];
}

export function filterCommands(commands: Command[], query: string): Command[] {
  const q = normalize(query.trim());
  if (!q) return commands;
  return commands.filter((c) => [c.label, ...c.keywords].some((t) => normalize(t).includes(q)));
}
