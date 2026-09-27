/**
 * Modo demo: la misma aplicación, publicada en la web para probarla en el navegador sin instalar nada. Solo se activa al compilar
 * con NEXT_PUBLIC_DEMO=1; la aplicación de escritorio no lo usa. La primera vez que se abre se llena con datos de ejemplo
 * inventados (un horario, unos eventos y unas notas) para que las pantallas no estén vacías. Todo queda en el navegador de quien
 * la prueba y se puede borrar con «Restablecer».
 */

export const ES_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

/** Anota que la demo ya se llenó: no se vuelve a pisar lo que la persona haya cambiado. */
export const MARCA_DEMO = "nexushub-demo-sembrado";

type Almacen = Pick<Storage, "getItem" | "setItem">;

const dosDigitos = (n: number) => String(n).padStart(2, "0");
const hhmm = (min: number) => `${dosDigitos(Math.floor(min / 60))}:${dosDigitos(min % 60)}`;
const fechaISO = (f: Date) => `${f.getFullYear()}-${dosDigitos(f.getMonth() + 1)}-${dosDigitos(f.getDate())}`;

/** Clases fijas de la semana (0 = lunes). */
const CLASES_BASE: readonly (readonly [string, string, string, string, number, string, string, string])[] = [
  ["Cálculo diferencial", "MAT-1010", "Dra. Ríos", "A-12", 0, "08:00", "09:40", "#4f8cff"],
  ["Programación", "SIS-1021", "Mtro. Vega", "Lab 3", 0, "10:00", "11:40", "#2ec4a6"],
  ["Física", "FIS-1005", "Dr. Salas", "B-04", 1, "08:00", "09:40", "#f0812a"],
  ["Inglés técnico", "ING-1002", "Mtra. Cruz", "C-21", 1, "12:00", "13:40", "#a26bff"],
  ["Cálculo diferencial", "MAT-1010", "Dra. Ríos", "A-12", 2, "08:00", "09:40", "#4f8cff"],
  ["Programación", "SIS-1021", "Mtro. Vega", "Lab 3", 2, "10:00", "11:40", "#2ec4a6"],
  ["Física", "FIS-1005", "Dr. Salas", "B-04", 3, "08:00", "09:40", "#f0812a"],
  ["Química", "QUI-1003", "Dra. Pardo", "B-09", 4, "10:00", "11:40", "#e5509f"],
];

/**
 * Los datos de ejemplo, listos para guardar (clave → texto). Si es antes de las 8 de la noche, hoy hay una clase que empieza en
 * unos 45 minutos: así «Tu día» muestra la cuenta regresiva en cuanto se abre la demo, a la hora que sea.
 */
export function datosDeDemo(ahora: Date): Record<string, string> {
  const hoy = (ahora.getDay() + 6) % 7;
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const inicioHoy = Math.ceil((minutosAhora + 45) / 5) * 5;
  const filas: (readonly [string, string, string, string, number, string, string, string])[] = CLASES_BASE.filter((c) => c[4] !== hoy);
  if (inicioHoy + 100 < 24 * 60 && ahora.getHours() < 20) {
    filas.push(["Cálculo diferencial", "MAT-1010", "Dra. Ríos", "A-12", hoy, hhmm(inicioHoy), hhmm(inicioHoy + 100), "#4f8cff"]);
  } else {
    filas.push(...CLASES_BASE.filter((c) => c[4] === hoy));
  }
  const horario = filas.map((c, i) => ({ id: `demo-c${i}`, materia: c[0], codigo: c[1], docente: c[2], aula: c[3], dia: c[4], inicio: c[5], fin: c[6], color: c[7] }));

  const enDias = (n: number) => {
    const f = new Date(ahora);
    f.setDate(f.getDate() + n);
    return fechaISO(f);
  };
  const evento = (i: number, titulo: string, categoria: string, dias: number, hora: string | null, color: string) => ({
    id: `demo-e${i}`, titulo, categoria, fecha: enDias(dias), hora, color, nota: "", avisar: false, repetir: "no",
  });
  const eventos = [
    evento(0, "Entregar la tarea de cálculo", "tarea", 1, "23:59", "#f0812a"),
    evento(1, "Asesoría con la Mtra. Cruz", "cita", 2, "16:00", "#3b82f6"),
    evento(2, "Examen de física", "examen", 3, "08:00", "#e5484d"),
    evento(3, "Proyecto de programación", "tarea", 5, null, "#f0812a"),
    evento(4, "Pagar la inscripción", "recordatorio", 12, null, "#a26bff"),
  ];
  const notas = [
    { id: "demo-n0", texto: "Comprar la calculadora científica", hecha: false },
    { id: "demo-n1", texto: "Leer el capítulo 4 de física", hecha: false },
    { id: "demo-n2", texto: "Imprimir el reporte de laboratorio", hecha: false },
  ];
  const guias = ["bienvenida", "video", "musica", "documentos", "herramienta", "carpetas", "calendario", "horario", "calculadora", "configuracion", "atajos"];

  return {
    "nexushub-guias-vistas": JSON.stringify(guias),
    "nexushub-tour-visto": "1",
    "nexushub-version-vista": "9.9.9",
    "nexushub-perfil": JSON.stringify({ nombre: "Ana" }),
    "nexushub-horario": JSON.stringify(horario),
    "nexushub-eventos": JSON.stringify(eventos),
    "nexushub-notas": JSON.stringify(notas),
  };
}

/** Llena el almacenamiento con los datos de ejemplo la primera vez. Devuelve true si lo hizo. */
export function sembrarDemo(almacen: Almacen, ahora: Date = new Date()): boolean {
  try {
    if (almacen.getItem(MARCA_DEMO) !== null) return false;
    for (const [clave, valor] of Object.entries(datosDeDemo(ahora))) almacen.setItem(clave, valor);
    almacen.setItem(MARCA_DEMO, ahora.toISOString());
    return true;
  } catch {
    return false; // sin almacenamiento (ventana privada): la demo abre vacía, sin romperse
  }
}

/** Borra todo lo de Nexo del navegador para que la demo vuelva a llenarse desde cero. */
export function reiniciarDemo(almacen: Pick<Storage, "length" | "key" | "removeItem">): void {
  try {
    const claves: string[] = [];
    for (let i = 0; i < almacen.length; i++) {
      const c = almacen.key(i);
      if (c && c.startsWith("nexushub-")) claves.push(c);
    }
    for (const c of claves) almacen.removeItem(c);
  } catch {
    /* sin almacenamiento: no hay nada que borrar */
  }
}
