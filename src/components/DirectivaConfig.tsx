import React, { useState } from "react";
import { Plus, Trash2, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { FormSection, InputField } from "@/components/ui-kit/Fields";

const CORE_KEYS = ["director", "secretaria", "directorAnt", "representante"];

export function DirectivaConfig() {
  const config = useApp((s) => s.config);
  const updateConfig = useApp((s) => s.updateConfig);

  const [nuevoCargo, setNuevoCargo] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");

  const firmas = config.firmas || {};

  const handleUpdate = (key: string, field: "nombre" | "cargo", val: string) => {
    const current = firmas[key] || { nombre: "", cargo: "" };
    updateConfig({
      firmas: {
        ...firmas,
        [key]: {
          nombre: field === "nombre" ? val : current.nombre || "",
          cargo: field === "cargo" ? val : current.cargo || "",
        },
      },
    });
  };

  const handleAddCustom = () => {
    if (!nuevoCargo.trim()) {
      toast.error("Ingrese el cargo o puesto (ej. Tesorero)");
      return;
    }

    // Generar clave slug unica (ej. "Tesorero General" -> "tesoreroGeneral")
    const keySlug = nuevoCargo
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w, i) => (i === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
      .join("");

    if (!keySlug) {
      toast.error("Nombre de cargo inválido");
      return;
    }

    if (firmas[keySlug]) {
      toast.error("Este cargo o puesto ya existe en la directiva");
      return;
    }

    updateConfig({
      firmas: {
        ...firmas,
        [keySlug]: {
          nombre: nuevoNombre.trim(),
          cargo: nuevoCargo.trim(),
        },
      },
    });

    toast.success(`Nuevo puesto de Directiva creado: ${nuevoCargo.trim()} ({${keySlug}Nombre}, {${keySlug}Cargo})`);
    setNuevoCargo("");
    setNuevoNombre("");
  };

  const handleDeleteCustom = (key: string, cargoName: string) => {
    const updated = { ...firmas };
    delete updated[key];
    updateConfig({ firmas: updated });
    toast.success(`Puesto de directiva '${cargoName}' eliminado`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Directiva y Responsables Institucionales
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configura los directivos, firmas y autoridades de la escuela. Cada puesto genera automáticamente sus marcadores para Word y Excel.
          </p>
        </div>
      </div>

      {/* Lista de Puestos de Directiva Existentes */}
      <FormSection title="Puestos y Responsables Actuales">
        {Object.entries(firmas).map(([k, item]) => {
          const isCore = CORE_KEYS.includes(k);
          return (
            <div key={k} className="col-span-3 p-3 rounded-lg border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">{item.cargo || k}</span>
                  <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    &#123;{k}Nombre&#125; / &#123;{k}Cargo&#125;
                  </code>
                </div>
                {!isCore && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustom(k, item.cargo || k)}
                    className="text-xs text-destructive hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Eliminar Puesto
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <InputField
                  label="Nombre del Responsable"
                  value={item.nombre}
                  onChange={(e) => handleUpdate(k, "nombre", e.target.value)}
                />
                <InputField
                  label="Cargo / Título"
                  value={item.cargo}
                  onChange={(e) => handleUpdate(k, "cargo", e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </FormSection>

      {/* Formulario para Crear Nuevo Puesto de Directiva */}
      <FormSection title="Crear Nuevo Puesto en la Directiva">
        <InputField
          label="Cargo / Puesto (ej. Tesorero, Vicerrector, Coordinador)"
          value={nuevoCargo}
          onChange={(e) => setNuevoCargo(e.target.value)}
        />
        <InputField
          label="Nombre del Responsable (ej. Lcdo. Carlos Ramos)"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
        />
        <div className="col-span-3 flex justify-end pt-2">
          <button
            type="button"
            onClick={handleAddCustom}
            className="h-9 px-4 rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Agregar Puesto a Directiva
          </button>
        </div>
      </FormSection>
    </div>
  );
}
