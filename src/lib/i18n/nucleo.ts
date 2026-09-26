/**
 * El corazón de los idiomas de Nexo, sin React ni nada de la aplicación (así se puede probar suelto).
 *
 * Cómo funciona: el texto en español ES la clave. `t("Guardar")` devuelve «Guardar» en español y «Save» en inglés; si a
 * una clave le falta la traducción, se muestra el español (nunca sale una clave rara ni un hueco). Las traducciones al inglés
 * viven en `src/lib/i18n/en/*.json`, una por sección, y `npm run i18n:check` avisa si falta alguna.
 *
 * Datos que no son código (listas de pasos de una guía, nombres de herramientas…): se marcan con `T("…")`, que devuelve el
 * mismo texto pero le avisa a la revisión de que hay una traducción que hacer; se traducen con `t(dato)` al mostrarlos.
 */

export type Idioma = "es" | "en";
export type PreferenciaIdioma = "sistema" | "es" | "en";

export const IDIOMAS: readonly Idioma[] = ["es", "en"];

/** Cómo se llama cada idioma, escrito en ese mismo idioma (así lo reconoce quien lo busca aunque no entienda el actual). */
export const NOMBRE_IDIOMA: Record<Idioma, string> = { es: "Español", en: "English" };

export type Variables = Record<string, string | number>;
export type Diccionario = Readonly<Record<string, string>>;

/** Marca un texto de un dato (no de una llamada a `t`) como «hay que traducirlo». No cambia el texto. */
export const T = <S extends string>(texto: S): S => texto;

/** El idioma que se usa: el que se eligió o, con «Igual que Windows», el del sistema (inglés si empieza por «en», si no español). */
export function resolverIdioma(preferencia: PreferenciaIdioma, idiomaDelSistema?: string | null): Idioma {
  if (preferencia === "es" || preferencia === "en") return preferencia;
  return (idiomaDelSistema ?? "").toLowerCase().startsWith("en") ? "en" : "es";
}

/** Lo que hay guardado como preferencia (JSON de los ajustes o nada) convertido en una preferencia válida. */
export function leerPreferencia(crudo: string | null | undefined): PreferenciaIdioma {
  if (!crudo) return "sistema";
  try {
    const valor = (JSON.parse(crudo) as { idioma?: unknown }).idioma;
    return valor === "es" || valor === "en" ? valor : "sistema";
  } catch {
    return "sistema";
  }
}

/** Sustituye {nombre} por su valor. Lo que no tenga valor se deja tal cual, para que se note en vez de esconderse. */
export function interpolar(texto: string, variables?: Variables): string {
  if (!variables) return texto;
  return texto.replace(/\{(\w+)\}/g, (completo, nombre: string) => (nombre in variables ? String(variables[nombre]) : completo));
}

/** Traduce una clave (el texto en español) con el diccionario del idioma; en español, o sin traducción, queda el español. */
export function traducirDe(ingles: Diccionario, idioma: Idioma, clave: string, variables?: Variables): string {
  const texto = idioma === "en" ? (ingles[clave] ?? clave) : clave;
  return interpolar(texto, variables);
}

/** El código de idioma para las fechas y los números del navegador («es-MX», «en-US»). */
export const localeDe = (idioma: Idioma): string => (idioma === "en" ? "en-US" : "es-MX");
