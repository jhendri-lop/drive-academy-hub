import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

export class LocalFileStorage {
  private static instance: LocalFileStorage | null = null;

  private constructor() {}

  public static getInstance(): LocalFileStorage {
    if (!LocalFileStorage.instance) {
      LocalFileStorage.instance = new LocalFileStorage();
    }
    return LocalFileStorage.instance;
  }

  public async getAppDirs(): Promise<{
    app_data_dir: string;
    documents_dir: string;
    database_path: string;
    photos_dir: string;
    assets_dir: string;
  }> {
    try {
      return (await invoke("ensure_app_dirs")) as any;
    } catch (e) {
      console.warn("Tauri IPC no disponible, usando rutas virtuales para desarrollo:", e);
      return {
        app_data_dir: "AppData/Roaming/ZentriumphDriveOfice",
        documents_dir: "Documents/ZentriumphDriveOfice",
        database_path: "AppData/Roaming/ZentriumphDriveOfice/database.db",
        photos_dir: "Documents/ZentriumphDriveOfice/Photos",
        assets_dir: "AppData/Roaming/ZentriumphDriveOfice/Assets",
      };
    }
  }

  public async saveFile(filePath: string, bytes: Uint8Array | ArrayBuffer): Promise<void> {
    // 1. Guardar en disco físico vía Tauri (si se ejecuta como App de escritorio)
    try {
      const contents = Array.from(new Uint8Array(bytes));
      await invoke("save_binary_file", { path: filePath, contents });
      console.log(`[LocalFileStorage] Archivo guardado exitosamente vía Tauri: ${filePath}`);
    } catch (e) {
      console.warn(`[LocalFileStorage] Tauri IPC no disponible. Guardado omitido en disco Tauri: ${filePath}`, e);
    }

    // 2. Disparar SIEMPRE la descarga directa del archivo en el navegador
    try {
      const u8 = new Uint8Array(bytes);
      const fileName = filePath.split("/").pop() || "documento.docx";
      const isExcel = fileName.endsWith(".xlsx");
      const isPdf = fileName.endsWith(".pdf");
      const mimeType = isExcel
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : isPdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      const blob = new Blob([u8], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`[LocalFileStorage] Descarga iniciada exitosamente en el navegador para: ${fileName}`);
    } catch (errDl) {
      console.error("[LocalFileStorage] Error al forzar descarga en navegador:", errDl);
    }
  }

  public async readFile(filePath: string): Promise<Uint8Array> {
    try {
      const data = (await invoke("read_binary_file", { path: filePath })) as number[];
      return new Uint8Array(data);
    } catch (e) {
      console.warn(`[LocalFileStorage] Tauri IPC no disponible. Retornando buffer vacío para: ${filePath}`, e);
      return new Uint8Array();
    }
  }

  public async selectDirectory(): Promise<string | null> {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Seleccionar Carpeta para Guardar Documentos del Curso",
      });
      if (selected && typeof selected === "string") {
        return selected;
      }
      return null;
    } catch (e) {
      console.warn("[LocalFileStorage] Error al abrir diálogo de selección de carpetas:", e);
      return null;
    }
  }

  public async getCourseFolderPath(courseName: string, customRoot?: string): Promise<string> {
    const safeName = courseName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const activeRoot = customRoot || (typeof window !== "undefined" ? (window as any).__LAST_CUSTOM_DOCS_ROOT__ : undefined);

    if (activeRoot && activeRoot.trim()) {
      const cleanRoot = activeRoot.trim().replace(/[/\\]+$/, "");
      return `${cleanRoot}/${safeName}`;
    }

    const dirs = await this.getAppDirs();
    return `${dirs.documents_dir}/${safeName}`;
  }

  public async openFolder(folderPath: string): Promise<void> {
    try {
      await invoke("open_folder", { path: folderPath });
      console.log(`[LocalFileStorage] Explorador de archivos abierto en: ${folderPath}`);
    } catch (e) {
      console.warn(`[LocalFileStorage] No se pudo abrir la carpeta vía IPC:`, e);
      toast.info(`Ubicación de la carpeta del curso: ${folderPath}`);
    }
  }
}
