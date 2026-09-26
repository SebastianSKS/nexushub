import type { Diccionario } from "../nucleo";
import calculadora from "./calculadora.json";
import calendario from "./calendario.json";
import comun from "./comun.json";
import configuracion from "./configuracion.json";
import documentos from "./documentos.json";
import guias from "./guias.json";
import horario from "./horario.json";
import inicio from "./inicio.json";
import musica from "./musica.json";
import novedades from "./novedades.json";
import shell from "./shell.json";
import video from "./video.json";

/**
 * Todas las traducciones al inglés, juntas. Cada archivo es una sección (la clave es el texto en español). Si una clave
 * está en dos archivos, gana el de la sección; `npm run i18n:check` avisa si dicen cosas distintas.
 */
export const SECCIONES_EN: Record<string, Diccionario> = { comun, shell, inicio, video, musica, documentos, calendario, horario, calculadora, configuracion, guias, novedades };

export const en: Diccionario = Object.assign({}, ...Object.values(SECCIONES_EN));
