import { infoCategoria } from "@/lib/calendario/categorias";
import { traducir } from "@/lib/i18n";
import { fechaLarga, fechaDesdeIso, mayuscula, nombreMes } from "@/lib/calendario/fechas";
import { fechaRelativa } from "@/lib/canales/fecha";
import { leerCanales } from "@/lib/canales/almacen";
import { TOOLS } from "@/lib/documents/tools";
import { evaluar, formatear } from "@/lib/calculadora/evaluar";
import { DIAS, nombreDiaSemana } from "@/lib/horario/horario";
import { rutaCanal, rutaHerramienta, rutaVer } from "@/lib/rutas";
import { normalize } from "@/lib/text";
import { useAccesosStore } from "@/store/accesos-store";
import { useCalendarioStore } from "@/store/calendario-store";
import { useCanalesStore } from "@/store/canales-store";
import { useFavoritosStore } from "@/store/favoritos-store";
import { useHorarioStore } from "@/store/horario-store";
import { useAjustesStore } from "@/store/ajustes-store";
import { useNotasStore } from "@/store/notas-store";
import { useReproductorStore } from "@/store/reproductor-store";
import { abrirAcceso } from "@/services/accesos";
import { abrirPdfEnPagina, buscarEnPdfs } from "@/services/indice-pdfs";
import type { Command } from "@/types";

/** Cuántos resultados se muestran como máximo de cada tipo (el resto se afina escribiendo más). */
const POR_GRUPO = 5;

/** Todos los términos que se escribieron tienen que estar (en cualquier orden, sin importar acentos ni mayúsculas). */
function coincide(terminos: string[], ...textos: (string | undefined)[]): boolean {
  const pajar = normalize(textos.filter(Boolean).join(" "));
  return terminos.every((t) => pajar.includes(t));
}

/** Los que empiezan por lo escrito van primero. */
function ordenar<T>(items: T[], titulo: (x: T) => string, q: string): T[] {
  const n = normalize(q.trim());
  return [...items].sort((a, b) => Number(!normalize(titulo(a)).startsWith(n)) - Number(!normalize(titulo(b)).startsWith(n)));
}

/** Prepara los almacenes que se leen al buscar (leen de este equipo; no hacen ninguna petición a internet). */
export function prepararBusqueda() {
  useCalendarioStore.getState().cargar();
  useAccesosStore.getState().cargar();
  void useAccesosStore.getState().buscarApps(); // ya lo sabe si se leyó antes en esta sesión
  useNotasStore.getState().cargar();
  useHorarioStore.getState().cargar();
  useFavoritosStore.getState().cargar();
}

/**
 * Lo que se encuentra en Nexo con lo que escribiste: tareas y eventos, clases del horario, cumpleaños,
 * apuntes, canales y sus videos, favoritos, herramientas de Documentos… y si es una cuenta, su resultado.
 * Cada resultado lleva a donde vive (a veces abriendo directamente esa cosa).
 */
export function buscarContenido(query: string, ir: (ruta: string) => void): Command[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const terminos = normalize(q).split(/\s+/).filter(Boolean);
  const salida: Command[] = [];

  // Una cuenta escrita en la barra: se resuelve ahí mismo.
  if (/[0-9]/.test(q) && /[+\-−×÷*/^%!()]|sin|cos|tan|log|sqrt|√|π/i.test(q)) {
    try {
      const n = evaluar(q, { grados: true, ans: 0 });
      const res = formatear(n);
      salida.push({
        id: "calc",
        group: traducir("Calculadora"),
        label: `${q} = ${res}`,
        hint: traducir("Pulsa Enter para copiar el resultado"),
        keywords: [],
        icon: "calculadora",
        run: () => void navigator.clipboard?.writeText(res).catch(() => {}),
      });
    } catch {
      /* todavía no es una cuenta completa */
    }
  }

  // Tareas, exámenes, citas y demás eventos.
  const { eventos, amigos } = useCalendarioStore.getState();
  ordenar(
    eventos.filter((e) => coincide(terminos, e.titulo, e.nota, infoCategoria(e.categoria).nombre, traducir(infoCategoria(e.categoria).nombre))),
    (e) => e.titulo,
    q,
  )
    .slice(0, POR_GRUPO)
    .forEach((e) => {
      const f = fechaDesdeIso(e.fecha);
      salida.push({
        id: `ev-${e.id}`,
        group: traducir("Tareas y eventos"),
        label: e.titulo,
        hint: `${traducir(infoCategoria(e.categoria).nombre)} · ${mayuscula(fechaLarga(f))}${e.hora ? ` · ${e.hora}` : ""}`,
        keywords: [],
        icon: infoCategoria(e.categoria).glifo,
        color: e.color,
        run: () => ir(`/calendario?evento=${e.id}`),
      });
    });

  // Clases del horario (también por día: «lunes» muestra las del lunes).
  const clases = useHorarioStore.getState().clases;
  ordenar(
    clases.filter((c) => coincide(terminos, c.materia, c.codigo, c.docente, c.aula, DIAS[c.dia], nombreDiaSemana(c.dia))),
    (c) => c.materia,
    q,
  )
    .slice(0, POR_GRUPO)
    .forEach((c) =>
      salida.push({
        id: `clase-${c.id}`,
        group: traducir("Horario"),
        label: c.materia,
        hint: `${nombreDiaSemana(c.dia)} ${c.inicio}–${c.fin}${c.docente ? ` · ${c.docente}` : ""}${c.aula ? ` · ${traducir("Aula {aula}", { aula: c.aula })}` : ""}`,
        keywords: [],
        icon: "reloj",
        color: c.color,
        run: () => ir(`/horario?clase=${c.id}`),
      }),
    );

  // Cumpleaños.
  amigos
    .filter((a) => coincide(terminos, a.nombre, a.nota, "cumpleaños", "birthday"))
    .slice(0, POR_GRUPO)
    .forEach((a) =>
      salida.push({
        id: `amigo-${a.id}`,
        group: traducir("Cumpleaños¦grupo"),
        label: a.nombre,
        hint: traducir("Cumpleaños · {dia} de {mes}", { dia: a.dia, mes: nombreMes(a.mes - 1) }),
        keywords: [],
        icon: "regalo",
        color: a.color,
        run: () => ir(`/calendario?amigo=${a.id}`),
      }),
    );

  // Apuntes (las notas rápidas).
  useNotasStore
    .getState()
    .notas.filter((n) => coincide(terminos, n.texto))
    .slice(0, POR_GRUPO)
    .forEach((n) =>
      salida.push({ id: `nota-${n.id}`, group: traducir("Apuntes"), label: n.texto, hint: n.hecha ? traducir("Hecho") : traducir("Pendiente"), keywords: [], icon: "tarea", run: () => ir("/calendario") }),
    );

  // Dentro de tus PDF (el texto ya leído de las carpetas de materias): el archivo, la página y el trozo donde aparece.
  if (useAjustesStore.getState().buscarEnPdfs && q.length >= 3) {
    buscarEnPdfs(terminos)
      .slice(0, POR_GRUPO)
      .forEach((c) =>
        salida.push({
          id: `pdf-${c.carpeta}/${c.nombre}`,
          group: traducir("En tus PDF"),
          label: c.nombre,
          hint: c.fragmento ? `${traducir("{carpeta} · página {n}", { carpeta: c.carpeta, n: c.pagina })}${c.paginasConCoincidencia > 1 ? ` ${traducir("(y en {n} más)", { n: c.paginasConCoincidencia - 1 })}` : ""}` : `${c.carpeta} · PDF`,
          detalle: c.fragmento || undefined,
          resaltar: terminos,
          keywords: [],
          icon: "documentos",
          marca: "pdf",
          run: () => void abrirPdfEnPagina({ carpeta: c.carpeta, nombre: c.nombre, pagina: c.fragmento ? c.pagina : undefined }),
        }),
      );
  }

  // Canales y sus videos.
  const canales = useCanalesStore.getState().canales;
  const lista = canales.length > 0 ? canales : (leerCanales() ?? []);
  lista
    .filter((c) => coincide(terminos, c.nombre))
    .slice(0, POR_GRUPO)
    .forEach((c) => salida.push({ id: `canal-${c.id}`, group: traducir("Canales"), label: c.nombre, hint: c.tipo === "canal" ? traducir("Canal de YouTube") : traducir("Lista de YouTube"), keywords: [], icon: "video", marca: "youtube", run: () => ir(rutaCanal(c.id)) }));

  const vistos = new Set<string>();
  Object.values(useCanalesStore.getState().feeds)
    .flatMap((f) => f.videos)
    .filter((v) => (vistos.has(v.videoId) ? false : (vistos.add(v.videoId), true)) && coincide(terminos, v.titulo, v.canalNombre))
    .sort((a, b) => Date.parse(b.publicado) - Date.parse(a.publicado))
    .slice(0, 6)
    .forEach((v) =>
      salida.push({ id: `video-${v.videoId}`, group: traducir("Videos"), label: v.titulo, hint: `${v.canalNombre} · ${fechaRelativa(v.publicado)}`, keywords: [], icon: "video", marca: "youtube", run: () => ir(rutaVer(v.videoId)) }),
    );

  // Favoritos: música (suena al instante) y videos guardados.
  useFavoritosStore
    .getState()
    .favoritos.filter((p) => coincide(terminos, p.titulo, p.artista))
    .slice(0, POR_GRUPO)
    .forEach((p) =>
      salida.push({
        id: `fav-${p.fuente}-${p.id}`,
        group: traducir("Favoritos"),
        label: p.titulo,
        hint: `${p.fuente === "spotify" ? traducir("Canción") : traducir("Video")} · ${p.artista}`,
        keywords: [],
        icon: "favoritoLleno",
        marca: p.fuente === "spotify" ? "spotify" : "youtube",
        run: () => (p.fuente === "youtube" ? ir(rutaVer(p.id)) : useReproductorStore.getState().reproducir(p, [p])),
      }),
    );

  // Accesos directos (Word, Canva, Drive…): abren la página en el navegador.
  useAccesosStore
    .getState()
    .accesos.filter((a) => coincide(terminos, a.nombre, a.url, a.app?.nombre))
    .slice(0, POR_GRUPO)
    .forEach((a) => salida.push({ id: `acceso-${a.id}`, group: traducir("Accesos directos"), label: a.nombre, hint: a.app ? traducir("Programa: {nombre}", { nombre: a.app.nombre }) : a.url, keywords: [], icon: "externo", color: a.color, run: () => void abrirAcceso(a) }));

  // Herramientas de Documentos.
  TOOLS.filter((t) => coincide(terminos, t.name, t.description, t.action, traducir(t.name), traducir(t.description), traducir(t.action)))
    .slice(0, POR_GRUPO)
    .forEach((t) => salida.push({ id: `tool-${t.id}`, group: traducir("Documentos"), label: traducir(t.name), hint: traducir(t.description), keywords: [], icon: "documentos", run: () => ir(rutaHerramienta(t.id)) }));

  return salida;
}
