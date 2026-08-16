import { invoke } from "@tauri-apps/api/core";
import { LocalFileStorage } from "./LocalFileStorage";

export const PLANTILLAS_LIST = [
  "Fase 1/OficioAutorizacionCompra.docx",
  "Fase 1/OficioCompraPermisos.docx",
  "Fase 2/ActaParte1.docx",
  "Fase 2/AcuerdoDeEnsenanza.docx",
  "Fase 2/FichaTeorica.docx",
  "Fase 3/OficioLegalizacion.docx",
  "Fase 4/ActaParte2.docx",
  "Fase 4/Titulos.docx",
];

export class TemplateStorage {
  private static instance: TemplateStorage | null = null;

  private constructor() {}

  public static getInstance(): TemplateStorage {
    if (!TemplateStorage.instance) {
      TemplateStorage.instance = new TemplateStorage();
    }
    return TemplateStorage.instance;
  }

  public async ensureTemplatesDir(): Promise<string> {
    const dirs = await LocalFileStorage.getInstance().getAppDirs();
    const templatesPath = `${dirs.app_data_dir}/plantillas`;

    try {
      await invoke("ensure_dir", { path: templatesPath });
      await invoke("ensure_dir", { path: `${templatesPath}/Fase 1` });
      await invoke("ensure_dir", { path: `${templatesPath}/Fase 2` });
      await invoke("ensure_dir", { path: `${templatesPath}/Fase 3` });
      await invoke("ensure_dir", { path: `${templatesPath}/Fase 4` });
    } catch (e) {
      console.warn("[TemplateStorage] No se pudo asegurar la creación de directorios de plantillas vía IPC:", e);
    }

    return templatesPath;
  }

  public async copyDefaultTemplates(): Promise<void> {
    const templatesPath = await this.ensureTemplatesDir();

    for (const relativePath of PLANTILLAS_LIST) {
      const destPath = `${templatesPath}/${relativePath}`;

      try {
        const exists = await invoke<boolean>("file_exists", { path: destPath });
        if (!exists) {
          const res = await fetch(`/templates/${relativePath}`);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const contents = Array.from(new Uint8Array(buffer));
            await invoke("save_binary_file", { path: destPath, contents });
            console.log(`[TemplateStorage] Plantilla predeterminada copiada a: ${destPath}`);
          }
        }
      } catch (e) {
        console.warn(`[TemplateStorage] Error copiando plantilla por defecto ${relativePath}:`, e);
      }
    }
  }

  public async openTemplatesFolder(): Promise<void> {
    const templatesPath = await this.ensureTemplatesDir();
    await LocalFileStorage.getInstance().openFolder(templatesPath);
  }

  public async getTemplateArrayBuffer(templateRelativePath: string): Promise<ArrayBuffer> {
    const templatesPath = await this.ensureTemplatesDir();
    const fullLocalPath = `${templatesPath}/${templateRelativePath}`;

    // 1. Intentar cargar desde la carpeta nativa en AppData (Plantilla Editable)
    try {
      const bytes = await invoke<number[]>("read_binary_file", { path: fullLocalPath });
      if (bytes && bytes.length > 0) {
        console.log(`[TemplateStorage] Plantilla cargada desde carpeta editable AppData: ${fullLocalPath}`);
        return new Uint8Array(bytes).buffer;
      }
    } catch (e) {
      console.warn(`[TemplateStorage] No se pudo leer la plantilla editable local (${fullLocalPath}), recurriendo al fallback empaquetado:`, e);
    }

    // 2. Fallback a la plantilla empaquetada (/templates/...)
    const fallbackUrl = `/templates/${templateRelativePath}`;
    const res = await fetch(fallbackUrl);
    if (!res.ok) {
      throw new Error(`Plantilla no encontrada: ${templateRelativePath}. Por favor reinspecciona la carpeta de plantillas.`);
    }
    return await res.arrayBuffer();
  }
}
