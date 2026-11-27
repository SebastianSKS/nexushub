import { create } from "zustand";
import { traducir } from "@/lib/i18n";
import { getTool } from "@/lib/documents/tools";
import { intakeFiles } from "@/services/documents/intake";
import type {
  CompressOptions,
  ImagesToPdfOptions,
  Notice,
  OcrOptions,
  OrganizeOptions,
  PageNumbersOptions,
  WatermarkOptions,
  PdfToImagesOptions,
  PdfToWordOptions,
  ProtectOptions,
  QueuedFile,
  RecoverOptions,
  RotateOptions,
  SplitOptions,
  ToolId,
  UnlockOptions,
} from "@/types/documents";

interface OptionsState {
  compress: CompressOptions;
  imagesToPdf: ImagesToPdfOptions;
  pdfToImages: PdfToImagesOptions;
  pdfToWord: PdfToWordOptions;
  split: SplitOptions;
  rotate: RotateOptions;
  protectPdf: ProtectOptions;
  unlockPdf: UnlockOptions;
  recoverPdf: RecoverOptions;
  organize: OrganizeOptions;
  watermark: WatermarkOptions;
  pageNumbers: PageNumbersOptions;
  ocr: OcrOptions;
}

const DEFAULT_OPTIONS: OptionsState = {
  compress: { level: "recommended" },
  imagesToPdf: { pageSize: "a4", orientation: "auto", margin: "small" },
  pdfToImages: { dpi: 150 },
  pdfToWord: { mode: "editable" },
  split: { ranges: "", mode: "single" },
  rotate: { rotations: {} },
  protectPdf: { password: "" },
  unlockPdf: { password: "" },
  recoverPdf: { metodo: "auto", maxLongitud: 6, juego: "numeros" },
  organize: { order: [] },
  watermark: { text: "CONFIDENCIAL", opacity: 25, layout: "diagonal", size: "medium", color: "gray" },
  pageNumbers: { position: "bottom-center", format: "n", start: 1, skipFirst: false },
  ocr: { output: "pdf" },
};

/** Qué grupo de opciones usa cada herramienta (las que no aparecen no tienen opciones). */
export const CLAVE_DE_OPCIONES: Partial<Record<ToolId, keyof OptionsState>> = {
  compress: "compress",
  "images-to-pdf": "imagesToPdf",
  "pdf-to-images": "pdfToImages",
  "pdf-to-word": "pdfToWord",
  split: "split",
  rotate: "rotate",
  "protect-pdf": "protectPdf",
  "unlock-pdf": "unlockPdf",
  "recover-pdf": "recoverPdf",
  organize: "organize",
  watermark: "watermark",
  "page-numbers": "pageNumbers",
  ocr: "ocr",
};

/** Lo que depende del archivo abierto y vuelve a su valor inicial al cambiar de archivo. */
const OPCIONES_POR_ARCHIVO = { split: DEFAULT_OPTIONS.split, rotate: DEFAULT_OPTIONS.rotate, organize: DEFAULT_OPTIONS.organize };

interface DocumentsState {
  files: QueuedFile[];
  /** Los que no son para la herramienta abierta: esperan aquí y vuelven a la lista al salir de ella. */
  apartados: QueuedFile[];
  toolId: ToolId | null;
  options: OptionsState;

  /** Total de páginas del PDF abierto en Dividir / Rotar. */
  pageCount: number | undefined;
  /** Selección de páginas (base 1) en Rotar. */
  selectedPages: number[];

  notices: Notice[];

  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  reorderFiles: (files: QueuedFile[]) => void;
  clearFiles: () => void;

  selectTool: (id: ToolId | null) => void;
  /** Vuelve a dejar preparado un trabajo de la cola (para corregir algo y repetirlo). */
  reabrir: (trabajo: { toolId: ToolId; files: QueuedFile[]; options: unknown }) => void;
  setOption: <K extends keyof OptionsState>(key: K, value: OptionsState[K]) => void;

  setPageCount: (n: number | undefined) => void;
  setSelectedPages: (pages: number[]) => void;

  pushNotice: (n: Omit<Notice, "id">) => void;
  dismissNotice: (id: string) => void;
  clearNotices: () => void;
}

/** Al cambiar de archivos, lo que dependía del anterior deja de valer. */
const RESET_PER_FILE = {
  pageCount: undefined as number | undefined,
  selectedPages: [] as number[],
};

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  files: [],
  apartados: [],
  toolId: null,
  options: DEFAULT_OPTIONS,

  ...RESET_PER_FILE,

  notices: [],

  addFiles: (incoming) => {
    const { files, toolId, pushNotice } = get();
    const tool = toolId ? getTool(toolId) : null;
    const single = tool?.maxFiles === 1;

    const { accepted, rejected } = intakeFiles(incoming, single ? [] : files);
    rejected.forEach(pushNotice);
    if (accepted.length === 0) return;

    if (single) {
      // Herramientas de un solo archivo: el nuevo reemplaza al anterior.
      if (accepted.length > 1) {
        pushNotice({
          severity: "info",
          title: traducir("{herramienta} trabaja con un archivo a la vez.", { herramienta: traducir(tool!.name) }),
          message: traducir("Se usó «{name}».", { name: accepted[0]!.file.name }),
        });
      }
      set({
        files: [accepted[0]!],
        ...RESET_PER_FILE,
        options: { ...get().options, ...OPCIONES_POR_ARCHIVO },
      });
      return;
    }
    set({ files: [...files, ...accepted], ...RESET_PER_FILE });
  },

  removeFile: (id) =>
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      ...RESET_PER_FILE,
      options: { ...s.options, ...OPCIONES_POR_ARCHIVO },
    })),
  reorderFiles: (files) => set({ files }),
  clearFiles: () =>
    set((s) => ({
      files: [],
      ...RESET_PER_FILE,
      options: { ...s.options, ...OPCIONES_POR_ARCHIVO },
    })),

  selectTool: (id) => {
    const { files, apartados, toolId, pushNotice } = get();
    // La misma herramienta: se deja todo como estaba.
    if (id !== null && id === toolId) return;
    const todos = [...files, ...apartados];
    let next = todos;
    if (id) {
      const tool = getTool(id);
      // Con archivos mezclados, la herramienta toma los suyos y los demás esperan (no se pierden).
      const suyos = todos.filter((f) => f.kind && tool.accepts.includes(f.kind));
      next = suyos.slice(0, tool.maxFiles);
      const ajenos = todos.length - suyos.length;
      if (ajenos > 0 && next.length > 0) {
        pushNotice({
          severity: "info",
          title: ajenos === 1 ? traducir("1 archivo se queda esperando.") : traducir("{n} archivos se quedan esperando.", { n: ajenos }),
          message: traducir("No son para {herramienta}. Siguen en Documentos para convertirlos con la suya.", { herramienta: traducir(tool.name) }),
        });
      }
      if (suyos.length > next.length) {
        pushNotice({
          severity: "info",
          title: traducir("{herramienta} trabaja con un archivo a la vez.", { herramienta: traducir(tool.name) }),
          message: traducir("Se usó «{name}».", { name: next[0]!.file.name }),
        });
      }
    }
    set((s) => ({
      toolId: id,
      files: next,
      apartados: todos.filter((f) => !next.includes(f)),
      ...RESET_PER_FILE,
      options: { ...s.options, ...OPCIONES_POR_ARCHIVO },
    }));
  },

  reabrir: ({ toolId, files, options }) =>
    set((s) => {
      const clave = CLAVE_DE_OPCIONES[toolId];
      const ids = new Set(files.map((f) => f.id));
      return {
        toolId,
        files,
        // Lo que hubiera preparado no se pierde.
        apartados: [...s.apartados, ...s.files].filter((f) => !ids.has(f.id)),
        ...RESET_PER_FILE,
        // Sobre los valores de fábrica: aunque al trabajo le faltara alguna opción, la pantalla las encuentra todas.
        options: { ...s.options, ...OPCIONES_POR_ARCHIVO, ...(clave ? { [clave]: { ...DEFAULT_OPTIONS[clave], ...structuredClone(options as object) } } : {}) },
      };
    }),

  setOption: (key, value) => set((s) => ({ options: { ...s.options, [key]: value } })),

  setPageCount: (pageCount) => set({ pageCount }),
  setSelectedPages: (selectedPages) => set({ selectedPages }),

  pushNotice: (n) => {
    const id = crypto.randomUUID();
    set((s) => ({ notices: [...s.notices.slice(-3), { ...n, id }] }));
    // Los avisos informativos y de éxito se retiran solos; los de error/advertencia esperan al usuario.
    if (n.severity === "success" || n.severity === "info") {
      setTimeout(() => get().dismissNotice(id), 9000);
    }
  },
  dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
  clearNotices: () => set({ notices: [] }),
}));
