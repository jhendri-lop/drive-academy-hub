import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  itemName?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = "¿Estás seguro que deseas eliminar?",
  itemName,
  description,
  confirmText = "Sí, Eliminar",
  cancelText = "Cancelar",
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-red-500/20 bg-card p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500 ring-4 ring-red-500/10">
            <AlertTriangle size={24} />
          </div>

          <div className="space-y-2 pr-4">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>

            {itemName && (
              <p className="text-sm font-medium text-red-400">
                "{itemName}"
              </p>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              {description ||
                "Esta acción no se puede deshacer. En caso de haber sido una equivocación, puedes presionar Cancelar."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-secondary/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-red-700 active:scale-[0.98] transition-all"
          >
            <Trash2 size={14} />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
