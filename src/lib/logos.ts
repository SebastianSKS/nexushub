import { siGmail, siGoogleclassroom, siGoogledocs, siGoogledrive, siGooglesheets, siGoogleslides } from "simple-icons";

/** Un logo de marca: el trazo (para dibujarlo en un cuadro de 24×24) y el color oficial de la marca. */
export interface Logo {
  nombre: string;
  path: string;
  /** Color oficial, «#RRGGBB». */
  color: string;
}

const de = (i: { title: string; path: string; hex: string }): Logo => ({ nombre: i.title, path: i.path, color: `#${i.hex}` });

/** Logos oficiales de los servicios web que se abren en el navegador (los programas instalados usan su propio icono). */
const POR_SERVICIO: { patron: RegExp; logo: Logo }[] = [
  { patron: /^https?:\/\/drive\.google\.com/i, logo: de(siGoogledrive) },
  { patron: /^https?:\/\/docs\.google\.com\/document/i, logo: de(siGoogledocs) },
  { patron: /^https?:\/\/docs\.google\.com\/spreadsheets/i, logo: de(siGooglesheets) },
  { patron: /^https?:\/\/docs\.google\.com\/presentation/i, logo: de(siGoogleslides) },
  { patron: /^https?:\/\/classroom\.google\.com/i, logo: de(siGoogleclassroom) },
  { patron: /^https?:\/\/mail\.google\.com/i, logo: de(siGmail) },
];

/** El logo de un acceso, si es de un servicio que conocemos. */
export function logoDe(url: string): Logo | null {
  return POR_SERVICIO.find((s) => s.patron.test(url))?.logo ?? null;
}
