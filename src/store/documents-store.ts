import { create } from "zustand";
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
  ResultItem,
  RotateOptions,
  SplitOptions,
  ToolId,
  UnlockOptions,
} from "@/types/documents";

export type RunStatus = "idle" | "running" | "done" | "error";

interface OptionsState {
  compress: CompressOptions;
  imagesToPdf: ImagesToPdfOptions;
  pdfToImages: PdfToImagesOptions;
  pdfToWord: PdfToWordOptions;
  split: SplitOptions;
  rotate: RotateOptions;
  protectPdf: ProtectOptions;
  unlockPdf: UnlockOptions;
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
  organize: { order: [] },
  watermark: { text: "CONFIDENCIAL", opacity: 25, layout: "diagonal", size: "medium", color: "gray" },
  pageNumbers: { position: "bottom-center", format: "n", start: 1, skipFirst: false },
  ocr: { output: "pdf" },
};

/** Lo que depende del archivo abierto y vuelve a su valor inicial al cambiar de archivo. */
const OPCIONES_POR_ARCHIVO = { split: DEFAULT_OPTIONS.split, rotate: DEFAULT_OPTIONS.rotate, organize: DEFAULT_OPTIONS.organize };

interface DocumentsState {

  files: QueuedFile[];
  toolId: ToolId | null;
  options: OptionsState;

  /** Total de páginas del PDF abierto en Dividir / Rotar. */
  pageCount: number | undefined;
  /** Selección de páginas (base 1) en Rotar. */
  selectedPages: number[];

  runStatus: RunStatus;
  progress: number;
  progressMessage: string;
  results: ResultItem[];
  warnings: string[];

  notices: Notice[];


  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  reorderFiles: (files: QueuedFile[]) => void;
  clearFiles: () => void;

  selectTool: (id: ToolId | null) => void;
  setOption: <K extends keyof OptionsState>(key: K, value: OptionsState[K]) => void;

  setPageCount: (n: number | undefined) => void;
  setSelectedPages: (pages: number[]) => void;

  beginRun: () => void;
  setProgress: (progress: number, message: string) => void;
  finishRun: (results: ResultItem[], warnings: string[]) => void;
  failRun: () => void;
  resetRun: () => void;

  pushNotice: (n: Omit<Notice, "id">) => void;
  dismissNotice: (id: string) => void;
  clearNotices: () => void;
}

/** Al cambiar de archivos, lo que dependía del anterior deja de valer. */
const RESET_PER_FILE = {
  pageCount: undefined as number | undefined,
  selectedPages: [] as number[],
  runStatus: "idle" as RunStatus,
  progress: 0,
  progressMessage: "",
  results: [] as ResultItem[],
  warnings: [] as string[],
};

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  files: [],
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
          title: `${tool!.name} trabaja con un archivo a la vez.`,
          message: `Se usó «${accepted[0]!.file.name}».`,
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
    const { files, pushNotice } = get();
    let next = files;
    if (id) {
      const tool = getTool(id);
      // Con una cola mezclada, se conservan solo los archivos que la herramienta admite.
      const accepted = files.filter((f) => f.kind && tool.accepts.includes(f.kind));
      if (accepted.length > 0 && accepted.length < files.length) {
        const left = files.length - accepted.length;
        next = accepted;
        pushNotice({
          severity: "info",
          title: `${left} ${left === 1 ? "archivo quedó fuera" : "archivos quedaron fuera"} de ${tool.name}.`,
          message: "No corresponden a esta herramienta. Vuelve a soltarlos si los necesitas para otra.",
        });
      }
      if (next.length > tool.maxFiles) {
        next = next.slice(0, tool.maxFiles);
        pushNotice({
          severity: "info",
          title: `${tool.name} trabaja con un archivo a la vez.`,
          message: `Se usó «${next[0]!.file.name}».`,
        });
      }
    }
    set((s) => ({
      toolId: id,
      files: next,
      ...RESET_PER_FILE,
      options: { ...s.options, ...OPCIONES_POR_ARCHIVO },
    }));
  },

  setOption: (key, value) => set((s) => ({ options: { ...s.options, [key]: value } })),

  setPageCount: (pageCount) => set({ pageCount }),
  setSelectedPages: (selectedPages) => set({ selectedPages }),

  beginRun: () => set({ runStatus: "running", progress: 0, progressMessage: "Preparando", results: [], warnings: [] }),
  setProgress: (progress, progressMessage) => set((s) => ({ progress: Math.max(s.progress, progress), progressMessage })),
  finishRun: (results, warnings) => set({ runStatus: "done", progress: 100, progressMessage: "Listo", results, warnings }),
  failRun: () => set({ runStatus: "error", progress: 0 }),
  resetRun: () => set({ runStatus: "idle", progress: 0, progressMessage: "", results: [], warnings: [] }),

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
