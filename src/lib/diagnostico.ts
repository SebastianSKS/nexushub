/**
 * La información que ayuda a arreglar un problema, escrita para pegarla en un reporte (GitHub, mensaje…). Solo cosas
 * técnicas de la aplicación: versión, sistema, idioma, en qué pantalla estaba y el error. Nunca datos personales (ni
 * tu nombre, ni tus archivos, ni tus canales, ni tu calendario).
 */

export interface DatosDiagnostico {
  version: string;
  /** «escritorio» (la aplicación instalada) o «web» (abierta en un navegador). */
  entorno: "escritorio" | "web";
  idioma: string;
  /** La ruta interna donde ocurrió («/horario»). */
  ruta?: string;
  /** El texto de «navigator.userAgent» (dice la versión de Windows y del motor de la ventana). */
  agente?: string;
  /** Lo que se sabe del equipo («4 núcleos, 8 GB, bajo consumo: no»): ayuda a entender quejas de lentitud. */
  equipo?: string;
  error?: { nombre?: string; mensaje?: string; pila?: string; digest?: string };
  fecha?: Date;
}

const MAX_PILA = 1200;

/** Recorta un texto largo para que el reporte no sea una pared, marcando que se cortó. */
export function recortar(texto: string, max: number): string {
  return texto.length <= max ? texto : `${texto.slice(0, max)}… (recortado)`;
}

/** Quita de un texto lo que parece una ruta de usuario de Windows (C:\Users\Nombre\…), para no filtrar el nombre de la cuenta. */
export function sinRutasDeUsuario(texto: string): string {
  return texto.replace(/[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s)'"]+/gi, "<usuario>").replace(/[A-Za-z]:[\\/]+Usuarios[\\/]+[^\\/\s)'"]+/gi, "<usuario>");
}

/** El bloque de texto listo para copiar. */
export function armarDiagnostico(d: DatosDiagnostico): string {
  const lineas = [
    "Nexo — información para reportar un problema",
    `Versión: ${d.version || "desconocida"}`,
    `Entorno: ${d.entorno}`,
    `Idioma: ${d.idioma}`,
  ];
  if (d.ruta) lineas.push(`Pantalla: ${d.ruta}`);
  if (d.agente) lineas.push(`Sistema: ${sinRutasDeUsuario(d.agente)}`);
  if (d.equipo) lineas.push(`Equipo: ${d.equipo}`);
  lineas.push(`Fecha: ${(d.fecha ?? new Date()).toISOString()}`);
  if (d.error) {
    const e = d.error;
    lineas.push("", `Error: ${[e.nombre, e.mensaje].filter(Boolean).map((x) => sinRutasDeUsuario(String(x))).join(": ") || "(sin mensaje)"}`);
    if (e.digest) lineas.push(`Código: ${e.digest}`);
    if (e.pila) lineas.push("", recortar(sinRutasDeUsuario(e.pila), MAX_PILA));
  }
  return lineas.join("\n");
}

/** La dirección para abrir un reporte nuevo en GitHub con el diagnóstico ya puesto (recortado: las direcciones largas fallan). */
export function direccionDeReporte(repo: string, diagnostico: string, titulo = "Problema en Nexo"): string {
  const cuerpo = recortar(diagnostico, 1500);
  const q = new URLSearchParams({ title: titulo, body: `**¿Qué estabas haciendo?**\n\n\n**Información**\n\n\`\`\`\n${cuerpo}\n\`\`\`\n` });
  return `https://github.com/${repo}/issues/new?${q.toString()}`;
}
