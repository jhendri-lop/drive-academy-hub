import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "./ui-kit/Primitives";
import { SQLiteClient } from "@/infrastructure/database/SQLiteClient";
import { useApp } from "@/lib/store";

export interface LogoDocRule {
  documentName: string;
  showLogo: boolean;
  showWatermark: boolean;
}

export const CATEGORIES = ["Recibo", "Oficios", "Fichas", "Actas", "Certificados", "Listados"] as const;

export const DOC_NAMES = [
  { id: "recibo", label: "Recibo de Pago / Caja", cat: "Recibo" },
  { id: "oficio_autorizacion", label: "Oficio de Autorización ANT", cat: "Oficios" },
  { id: "oficio_compra", label: "Oficio de Compra de Permisos", cat: "Oficios" },
  { id: "excel_permisos_ant", label: "Excel Permisos ANT (.xlsx)", cat: "Listados" },
  { id: "anexo_permisos", label: "Anexo Permisos (.xlsx)", cat: "Listados" },
  { id: "acuerdo_ensenanza", label: "Acuerdo de Enseñanza y Compromiso", cat: "Certificados" },
  { id: "ficha_teorica", label: "Ficha de Asistencia Teoría", cat: "Fichas" },
  { id: "ficha_practica", label: "Ficha de Asistencia Práctica (.xlsx)", cat: "Fichas" },
  { id: "acta_parte1", label: "Acta de Grado - Parte 1", cat: "Actas" },
  { id: "entrega_documentos", label: "Entrega de Documentos y Permisos (.xlsx)", cat: "Listados" },
  { id: "oficio_legalizacion", label: "Oficio de Legalización de Actas", cat: "Oficios" },
  { id: "anexo_legalizacion", label: "Anexo Legalización ANT (.xlsx)", cat: "Listados" },
  { id: "base_legalizacion", label: "Base Datos Legalización (.xlsx)", cat: "Listados" },
  { id: "acta_parte2", label: "Acta de Grado - Parte 2", cat: "Actas" },
  { id: "titulo", label: "Título de Conductor Profesional", cat: "Certificados" },
  { id: "fotos_3x4", label: "Fotos 3x4 Alumnos (.pdf)", cat: "Certificados" },
  { id: "base_general", label: "Base General del Curso (.xlsx)", cat: "Listados" },
];

export function LogoDocsConfig() {
  const updateConfig = useApp((s) => s.updateConfig);
  const config = useApp((s) => s.config);

  const [rules, setRules] = useState<Record<string, { showLogo: boolean; showWatermark: boolean }>>(() => {
    const init: Record<string, { showLogo: boolean; showWatermark: boolean }> = {};
    DOC_NAMES.forEach((d) => {
      init[d.id] = {
        showLogo: Boolean(config.logoDocs?.[d.id] ?? (d.cat === "Oficios" || d.id === "recibo" || d.id === "excel_permisos_ant")),
        showWatermark: Boolean(config.watermarkDocs?.[d.id] ?? false),
      };
    });
    return init;
  });

  useEffect(() => {
    const load = async () => {
      try {
        const client = SQLiteClient.getInstance();
        const rows = client.queryAll(`SELECT * FROM logo_documents`);
        if (rows.length > 0) {
          const map: Record<string, { showLogo: boolean; showWatermark: boolean }> = {};
          rows.forEach((r) => {
            map[r.document_name] = {
              showLogo: Boolean(r.show_logo),
              showWatermark: Boolean(r.show_watermark),
            };
          });
          setRules((prev) => ({ ...prev, ...map }));
        }
      } catch (e) {
        console.error("Error al cargar reglas de logo:", e);
      }
    };
    load();
  }, []);

  const toggleCategory = (cat: string) => {
    const catDocs = DOC_NAMES.filter((d) => d.cat === cat);
    const allChecked = catDocs.every((d) => rules[d.id]?.showLogo);

    setRules((prev) => {
      const next = { ...prev };
      catDocs.forEach((d) => {
        next[d.id] = {
          ...next[d.id]!,
          showLogo: !allChecked,
        };
      });
      return next;
    });
  };

  const toggleLogo = (docId: string) => {
    setRules((prev) => ({
      ...prev,
      [docId]: {
        ...prev[docId]!,
        showLogo: !prev[docId]?.showLogo,
      },
    }));
  };

  const toggleWatermark = (docId: string) => {
    setRules((prev) => ({
      ...prev,
      [docId]: {
        ...prev[docId]!,
        showWatermark: !prev[docId]?.showWatermark,
      },
    }));
  };

  useEffect(() => {
    const logoDocsMap: Record<string, boolean> = {};
    const watermarkDocsMap: Record<string, boolean> = {};
    DOC_NAMES.forEach((d) => {
      logoDocsMap[d.id] = Boolean(rules[d.id]?.showLogo);
      watermarkDocsMap[d.id] = Boolean(rules[d.id]?.showWatermark);
    });
    updateConfig({
      logoDocs: logoDocsMap,
      watermarkDocs: watermarkDocsMap,
    });
  }, [rules, updateConfig]);

  const guardarConfiguracion = async () => {
    try {
      const client = SQLiteClient.getInstance();
      const logoDocsMap: Record<string, boolean> = {};
      const watermarkDocsMap: Record<string, boolean> = {};

      for (const d of DOC_NAMES) {
        const r = rules[d.id] || { showLogo: false, showWatermark: false };
        logoDocsMap[d.id] = r.showLogo;
        watermarkDocsMap[d.id] = r.showWatermark;

        await client.execute(
          `INSERT INTO logo_documents (document_name, show_logo, show_watermark) VALUES (?, ?, ?)
           ON CONFLICT(document_name) DO UPDATE SET show_logo = excluded.show_logo, show_watermark = excluded.show_watermark;`,
          [d.id, r.showLogo ? 1 : 0, r.showWatermark ? 1 : 0]
        );
      }

      updateConfig({
        logoDocs: logoDocsMap,
        watermarkDocs: watermarkDocsMap,
      });

      toast.success("Configuración de logo y marca de agua guardada correctamente");
    } catch (err: any) {
      toast.error(`Error al guardar: ${err.message}`);
    }
  };

  return (
    <Panel className="space-y-5">
      <div className="border-b pb-3">
        <h3 className="text-sm font-semibold">Selector de Logo y Marca de Agua por Documento</h3>
        <p className="text-xs text-muted-foreground">
          Elija en qué documentos impresos debe incluirse el logo oficial en la esquina superior izquierda y la marca de agua centrada.
        </p>
      </div>

      {/* Categorías superiores como la Imagen 3 */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {CATEGORIES.map((cat) => {
          const catDocs = DOC_NAMES.filter((d) => d.cat === cat);
          const isChecked = catDocs.length > 0 && catDocs.every((d) => rules[d.id]?.showLogo);
          return (
            <div
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                isChecked ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}}
                className="rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-xs font-medium">{cat}</span>
            </div>
          );
        })}
      </div>

      <div className="divide-y rounded-md border bg-background">
        {DOC_NAMES.map((d) => {
          const r = rules[d.id] || { showLogo: false, showWatermark: false };
          return (
            <div key={d.id} className="flex items-center justify-between p-3 text-xs">
              <span className="font-medium text-foreground">{d.label}</span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={r.showLogo}
                    onChange={() => toggleLogo(d.id)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span>Mostrar Logo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={r.showWatermark}
                    onChange={() => toggleWatermark(d.id)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span>Marca de Agua</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
