import React, { useState, useEffect } from "react";
import { Hash, FileText, Check, X } from "lucide-react";
import { Modal } from "@/components/ui-kit/Modal";
import { InputField } from "@/components/ui-kit/Fields";

interface OficioNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startNumber: number, numeroTramite?: string) => void;
  currentNumber: number;
  title?: string;
  countOficios?: number;
  showNumeroTramite?: boolean;
}

export function OficioNumberModal({
  isOpen,
  onClose,
  onConfirm,
  currentNumber,
  title = "Confirmar Número de Oficio",
  countOficios = 2,
  showNumeroTramite = false,
}: OficioNumberModalProps) {
  const [num, setNum] = useState<string>(String(currentNumber || 1152));
  const [numeroTramite, setNumeroTramite] = useState<string>("00");

  useEffect(() => {
    if (isOpen) {
      setNum(String(currentNumber || 1152));
    }
  }, [currentNumber, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const parsed = parseInt(num.trim(), 10);
    if (isNaN(parsed) || parsed <= 0) {
      return;
    }
    onConfirm(parsed, numeroTramite.trim());
  };

  const endNum = (parseInt(num.trim(), 10) || currentNumber) + (countOficios - 1);
  const nextNum = (parseInt(num.trim(), 10) || currentNumber) + countOficios;

  return (
    <Modal open={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
          <Hash className="h-5 w-5 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">Secuencial de Oficios Institucional</p>
            <p className="text-muted-foreground mt-0.5">
              Puedes mantener el número sugerido o cambiarlo si emitiste oficios externos. El sistema continuará automáticamente la secuencia desde el número que elijas.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <InputField
            label="Número del Primer Oficio (ej. 1152)"
            type="number"
            value={num}
            onChange={(e) => setNum(e.target.value)}
          />

          {showNumeroTramite && (
            <InputField
              label="Número de Trámite de Ingreso Matriculados"
              type="text"
              value={numeroTramite}
              onChange={(e) => setNumeroTramite(e.target.value)}
              placeholder="00"
            />
          )}

          <div className="p-3 rounded-md bg-muted text-xs space-y-1 text-muted-foreground">
            <p className="flex justify-between">
              <span>Primer Oficio:</span>
              <strong className="text-foreground">2026-{(parseInt(num, 10) || currentNumber)}</strong>
            </p>
            {countOficios > 1 && (
              <p className="flex justify-between">
                <span>Último Oficio del paquete:</span>
                <strong className="text-foreground">2026-{endNum}</strong>
              </p>
            )}
            <p className="flex justify-between border-t pt-1 mt-1 text-primary font-medium">
              <span>Siguiente curso iniciará en:</span>
              <strong>{nextNum}</strong>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border text-xs font-semibold hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-9 px-4 rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" /> Confirmar y Generar
          </button>
        </div>
      </div>
    </Modal>
  );
}
