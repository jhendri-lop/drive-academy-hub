import { useState, useEffect } from "react";
import { Plus, Trash2, Save, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Badge, Panel } from "./ui-kit/Primitives";
import { SQLiteClient } from "@/infrastructure/database/SQLiteClient";

export interface CustomField {
  id?: number;
  fieldName: string;
  fieldType: "text" | "number" | "date";
  showInDocuments: string[]; // ['Acuerdo', 'Ficha', 'Acta', 'Recibo']
}

export function CustomFieldsView() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<"text" | "number" | "date">("text");

  const cargarCampos = async () => {
    try {
      const client = SQLiteClient.getInstance();
      const rows = client.queryAll(`SELECT * FROM custom_fields`);
      setFields(
        rows.map((r) => ({
          id: r.id,
          fieldName: r.field_name,
          fieldType: r.field_type || "text",
          showInDocuments: r.show_in_documents ? JSON.parse(r.show_in_documents) : ["Acuerdo", "Ficha"],
        }))
      );
    } catch {
      setFields([
        { id: 1, fieldName: "Referencia Familiar", fieldType: "text", showInDocuments: ["Acuerdo"] },
        { id: 2, fieldName: "Carnet CONADIS", fieldType: "text", showInDocuments: ["Ficha", "Acta"] },
      ]);
    }
  };

  useEffect(() => {
    cargarCampos();
  }, []);

  const agregarCampo = async () => {
    if (!nuevoNombre.trim()) {
      toast.error("Ingrese el nombre del campo personalizado");
      return;
    }

    try {
      const client = SQLiteClient.getInstance();
      const docsJson = JSON.stringify(["Acuerdo", "Ficha"]);
      await client.execute(
        `INSERT INTO custom_fields (field_name, field_type, show_in_documents) VALUES (?, ?, ?)`,
        [nuevoNombre.trim(), nuevoTipo, docsJson]
      );
      toast.success(`Campo "${nuevoNombre}" agregado correctamente`);
      setNuevoNombre("");
      cargarCampos();
    } catch (err: any) {
      toast.error(`Error al guardar campo: ${err.message}`);
    }
  };

  const eliminarCampo = async (id?: number) => {
    if (!id) return;
    try {
      const client = SQLiteClient.getInstance();
      await client.execute(`DELETE FROM custom_fields WHERE id = ?`, [id]);
      toast.success("Campo eliminado");
      cargarCampos();
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err.message}`);
    }
  };

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold">Campos Personalizados por Escuela</h3>
          <p className="text-xs text-muted-foreground">Defina atributos adicionales para estudiantes e inyéctelos en documentos impresos</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-md border bg-muted/20 p-3">
        <input
          type="text"
          placeholder="Nombre del nuevo campo (ej. Código Empleado, Alergias)..."
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
        />
        <select
          value={nuevoTipo}
          onChange={(e) => setNuevoTipo(e.target.value as any)}
          className="rounded-md border bg-background px-3 py-1.5 text-xs outline-none"
        >
          <option value="text">Texto</option>
          <option value="number">Número</option>
          <option value="date">Fecha</option>
        </select>
        <button
          onClick={agregarCampo}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus size={14} /> Agregar campo
        </button>
      </div>

      <div className="divide-y rounded-md border bg-background">
        {fields.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">No hay campos personalizados configurados</div>
        ) : (
          fields.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-foreground">{f.fieldName}</span>
                <div className="flex gap-1.5">
                  <Badge tone="muted">Tipo: {f.fieldType}</Badge>
                  {f.showInDocuments.map((d) => (
                    <Badge key={d} tone="primary">{d}</Badge>
                  ))}
                </div>
              </div>
              <button
                onClick={() => eliminarCampo(f.id)}
                className="text-rose-400 hover:text-rose-600 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
