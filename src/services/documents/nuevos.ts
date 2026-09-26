import JSZip from "jszip";
import { T } from "../../lib/i18n/nucleo.ts";

/**
 * Archivos en blanco para empezar a trabajar en una carpeta de materia: un Word, un Excel, un PowerPoint o un texto.
 * Se arman aquí mismo (un archivo de Office es un ZIP con XML dentro), sin plantillas ni internet, y se abren con el
 * programa que el usuario tenga para ese tipo de archivo.
 */

/** Lo que depende del idioma en el archivo en blanco: el idioma del corrector y los textos de la primera diapositiva. */
export interface OpcionesNuevo {
  lang?: string;
  tituloDiapositiva?: string;
  subtituloDiapositiva?: string;
}

export type TipoNuevo = "word" | "excel" | "powerpoint" | "texto";

export interface InfoNuevo {
  tipo: TipoNuevo;
  titulo: string;
  /** El nombre corto, para el botón: «Word», «Excel»… */
  corto: string;
  descripcion: string;
  extension: string;
  /** Nombre que se propone al crearlo. */
  nombre: string;
}

export const NUEVOS: readonly InfoNuevo[] = [
  { tipo: "word", titulo: T("Documento de Word"), corto: T("Word"), descripcion: T("Para escribir trabajos, informes y ensayos."), extension: ".docx", nombre: T("Documento nuevo") },
  { tipo: "excel", titulo: T("Hoja de Excel"), corto: T("Excel"), descripcion: T("Para tablas, cuentas y gráficos."), extension: ".xlsx", nombre: T("Hoja de cálculo nueva") },
  { tipo: "powerpoint", titulo: T("Presentación de PowerPoint"), corto: T("PowerPoint"), descripcion: T("Para exponer con diapositivas."), extension: ".pptx", nombre: T("Presentación nueva") },
  { tipo: "texto", titulo: T("Archivo de texto"), corto: T("Texto"), descripcion: T("Notas rápidas, sin formato (.txt)."), extension: ".txt", nombre: T("Notas nuevas") },
];

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const NS_TIPOS = "http://schemas.openxmlformats.org/package/2006/content-types";

const relaciones = (items: { id: string; tipo: string; destino: string }[]) =>
  `${XML}<Relationships xmlns="${NS_REL}">${items.map((r) => `<Relationship Id="${r.id}" Type="${REL}/${r.tipo}" Target="${r.destino}"/>`).join("")}</Relationships>`;

const tipos = (overrides: [string, string][]) =>
  `${XML}<Types xmlns="${NS_TIPOS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${overrides
    .map(([parte, tipo]) => `<Override PartName="${parte}" ContentType="${tipo}"/>`)
    .join("")}</Types>`;

const OFFICE = "application/vnd.openxmlformats-officedocument";

async function empaquetar(zip: JSZip): Promise<Blob> {
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

// ─── Word ────────────────────────────────────────────────────────────────────────────────────────────────────────────

async function docx(lang: string): Promise<Blob> {
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const zip = new JSZip();
  zip.file("[Content_Types].xml", tipos([["/word/document.xml", `${OFFICE}.wordprocessingml.document.main+xml`], ["/word/styles.xml", `${OFFICE}.wordprocessingml.styles+xml`]]));
  zip.file("_rels/.rels", relaciones([{ id: "rId1", tipo: "officeDocument", destino: "word/document.xml" }]));
  zip.file("word/_rels/document.xml.rels", relaciones([{ id: "rId1", tipo: "styles", destino: "styles.xml" }]));
  zip.file(
    "word/document.xml",
    `${XML}<w:document xmlns:w="${W}"><w:body><w:p/><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  );
  // Letra y espacios como los de un documento nuevo de Word (Calibri 11, 8 pt de espacio después de cada párrafo).
  zip.file(
    "word/styles.xml",
    `${XML}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="${lang}" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`,
  );
  return empaquetar(zip);
}

// ─── Excel ───────────────────────────────────────────────────────────────────────────────────────────────────────────

async function xlsx(): Promise<Blob> {
  const S = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    tipos([
      ["/xl/workbook.xml", `${OFFICE}.spreadsheetml.sheet.main+xml`],
      ["/xl/worksheets/sheet1.xml", `${OFFICE}.spreadsheetml.worksheet+xml`],
      ["/xl/styles.xml", `${OFFICE}.spreadsheetml.styles+xml`],
    ]),
  );
  zip.file("_rels/.rels", relaciones([{ id: "rId1", tipo: "officeDocument", destino: "xl/workbook.xml" }]));
  zip.file("xl/workbook.xml", `${XML}<workbook xmlns="${S}" xmlns:r="${REL}"><sheets><sheet name="Hoja1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", relaciones([{ id: "rId1", tipo: "worksheet", destino: "worksheets/sheet1.xml" }, { id: "rId2", tipo: "styles", destino: "styles.xml" }]));
  zip.file("xl/worksheets/sheet1.xml", `${XML}<worksheet xmlns="${S}"><sheetData/></worksheet>`);
  zip.file(
    "xl/styles.xml",
    `${XML}<styleSheet xmlns="${S}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  );
  return empaquetar(zip);
}

// ─── PowerPoint ──────────────────────────────────────────────────────────────────────────────────────────────────────

const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const CABECERA_ARBOL = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

/** Tema de Office (colores y letras de siempre): PowerPoint lo exige aunque no se vea. */
function tema(): string {
  const relleno = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  const linea = (w: number) => `<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>`;
  const efecto = '<a:effectStyle><a:effectLst/></a:effectStyle>';
  return (
    `${XML}<a:theme xmlns:a="${A}" name="Office"><a:themeElements>` +
    '<a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>' +
    '<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
    `<a:fmtScheme name="Office"><a:fillStyleLst>${relleno}${relleno}${relleno}</a:fillStyleLst><a:lnStyleLst>${linea(6350)}${linea(12700)}${linea(19050)}</a:lnStyleLst><a:effectStyleLst>${efecto}${efecto}${efecto}</a:effectStyleLst><a:bgFillStyleLst>${relleno}${relleno}${relleno}</a:bgFillStyleLst></a:fmtScheme>` +
    "</a:themeElements></a:theme>"
  );
}

/** Un marcador de texto («Haga clic para agregar título»): hereda su lugar de la plantilla de la diapositiva. */
const marcador = (id: number, nombre: string, ph: string, lang: string) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${nombre}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph ${ph}/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="${lang}"/></a:p></p:txBody></p:sp>`;

async function pptx(opc: Required<OpcionesNuevo>): Promise<Blob> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    tipos([
      ["/ppt/presentation.xml", `${OFFICE}.presentationml.presentation.main+xml`],
      ["/ppt/slideMasters/slideMaster1.xml", `${OFFICE}.presentationml.slideMaster+xml`],
      ["/ppt/slideLayouts/slideLayout1.xml", `${OFFICE}.presentationml.slideLayout+xml`],
      ["/ppt/slides/slide1.xml", `${OFFICE}.presentationml.slide+xml`],
      ["/ppt/theme/theme1.xml", `${OFFICE}.theme+xml`],
    ]),
  );
  zip.file("_rels/.rels", relaciones([{ id: "rId1", tipo: "officeDocument", destino: "ppt/presentation.xml" }]));
  zip.file(
    "ppt/presentation.xml",
    `${XML}<p:presentation xmlns:a="${A}" xmlns:r="${REL}" xmlns:p="${P}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
  );
  zip.file("ppt/_rels/presentation.xml.rels", relaciones([{ id: "rId1", tipo: "slideMaster", destino: "slideMasters/slideMaster1.xml" }, { id: "rId2", tipo: "slide", destino: "slides/slide1.xml" }, { id: "rId3", tipo: "theme", destino: "theme/theme1.xml" }]));
  zip.file("ppt/theme/theme1.xml", tema());
  zip.file(
    "ppt/slideMasters/slideMaster1.xml",
    `${XML}<p:sldMaster xmlns:a="${A}" xmlns:r="${REL}" xmlns:p="${P}"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${CABECERA_ARBOL}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="2800"><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`,
  );
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", relaciones([{ id: "rId1", tipo: "slideLayout", destino: "../slideLayouts/slideLayout1.xml" }, { id: "rId2", tipo: "theme", destino: "../theme/theme1.xml" }]));
  // Diapositiva de título: un título grande al centro y un subtítulo debajo.
  const lugar = (x: number, y: number, cx: number, cy: number) => `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm></p:spPr>`;
  zip.file(
    "ppt/slideLayouts/slideLayout1.xml",
    `${XML}<p:sldLayout xmlns:a="${A}" xmlns:r="${REL}" xmlns:p="${P}" type="title" preserve="1"><p:cSld name="Diapositiva de título"><p:spTree>${CABECERA_ARBOL}` +
      `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Título"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr>${lugar(1524000, 1122363, 9144000, 2387600)}<p:txBody><a:bodyPr anchor="b"/><a:lstStyle><a:lvl1pPr algn="ctr"><a:defRPr sz="6000"/></a:lvl1pPr></a:lstStyle><a:p><a:r><a:rPr lang="${opc.lang}"/><a:t>${opc.tituloDiapositiva}</a:t></a:r></a:p></p:txBody></p:sp>` +
      `<p:sp><p:nvSpPr><p:cNvPr id="3" name="Subtítulo"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="subTitle" idx="1"/></p:nvPr></p:nvSpPr>${lugar(1524000, 3602038, 9144000, 1655762)}<p:txBody><a:bodyPr/><a:lstStyle><a:lvl1pPr marL="0" indent="0" algn="ctr"><a:buNone/><a:defRPr sz="2400"/></a:lvl1pPr></a:lstStyle><a:p><a:r><a:rPr lang="${opc.lang}"/><a:t>${opc.subtituloDiapositiva}</a:t></a:r></a:p></p:txBody></p:sp>` +
      `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
  );
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", relaciones([{ id: "rId1", tipo: "slideMaster", destino: "../slideMasters/slideMaster1.xml" }]));
  zip.file(
    "ppt/slides/slide1.xml",
    `${XML}<p:sld xmlns:a="${A}" xmlns:r="${REL}" xmlns:p="${P}"><p:cSld><p:spTree>${CABECERA_ARBOL}${marcador(2, "Título 1", 'type="ctrTitle"', opc.lang)}${marcador(3, "Subtítulo 2", 'type="subTitle" idx="1"', opc.lang)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
  );
  zip.file("ppt/slides/_rels/slide1.xml.rels", relaciones([{ id: "rId1", tipo: "slideLayout", destino: "../slideLayouts/slideLayout1.xml" }]));
  return empaquetar(zip);
}

/** El nombre con el que queda el archivo: el que se escribió (o el propuesto) más la extensión, sin repetirla si ya la traía. */
export function nombreDeArchivoNuevo(tipo: TipoNuevo, nombre: string): string {
  const info = NUEVOS.find((n) => n.tipo === tipo)!;
  const escrito = nombre.trim();
  const sinExtension = escrito.toLowerCase().endsWith(info.extension) ? escrito.slice(0, -info.extension.length).trim() : escrito;
  return `${sinExtension || info.nombre}${info.extension}`;
}

/** Un archivo en blanco del tipo pedido, con el nombre dado (la extensión se añade sola si falta). */
export async function crearArchivoNuevo(tipo: TipoNuevo, nombre: string, opciones: OpcionesNuevo = {}): Promise<File> {
  const opc: Required<OpcionesNuevo> = { lang: "es-MX", tituloDiapositiva: "Haga clic para agregar título", subtituloDiapositiva: "Haga clic para agregar subtítulo", ...opciones };
  const cuerpo = tipo === "word" ? await docx(opc.lang) : tipo === "excel" ? await xlsx() : tipo === "powerpoint" ? await pptx(opc) : new Blob([""], { type: "text/plain" });
  return new File([cuerpo], nombreDeArchivoNuevo(tipo, nombre), { type: cuerpo.type });
}
