import { Moon, Sun } from "lucide-react";
import { useApp, type Palette } from "@/lib/store";
import { cn } from "@/lib/utils";

export const PALETAS: { id: Palette; nombre: string; hex: string }[] = [
  { id: "azul", nombre: "Azul Profesional", hex: "#3b82f6" },
  { id: "verde", nombre: "Verde Moderno", hex: "#10b981" },
  { id: "naranja", nombre: "Naranja Cálido", hex: "#f59e0b" },
  { id: "rojo", nombre: "Rojo Energético", hex: "#ef4444" },
];

export function ThemeToggle() {
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-8 items-center gap-2 rounded-md border border-border px-3 text-[12px] font-medium transition-colors hover:border-primary hover:text-primary bg-surface text-foreground"
      aria-label="Cambiar tema"
      title={theme === "dark" ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
    >
      {theme === "dark" ? (
        <>
          <Moon size={14} className="text-blue-400" />
          <span>Oscuro</span>
        </>
      ) : (
        <>
          <Sun size={14} className="text-amber-500" />
          <span>Claro</span>
        </>
      )}
    </button>
  );
}

export function ColorPicker({ compact = false }: { compact?: boolean }) {
  const palette = useApp((s) => s.palette);
  const setPalette = useApp((s) => s.setPalette);
  return (
    <div className={cn("flex items-center gap-2", !compact && "flex-wrap")}>
      {PALETAS.map((p) => (
        <button
          key={p.id}
          onClick={() => setPalette(p.id)}
          title={p.nombre}
          className={cn(
            "flex items-center gap-2 rounded-md border p-1 transition-all bg-surface text-foreground",
            palette === p.id ? "border-primary ring-2 ring-primary/40 font-bold" : "border-border hover:border-primary/50",
            compact ? "" : "px-2.5 py-1.5",
          )}
        >
          <span className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: p.hex }} />
          {!compact && <span className="text-[11px]">{p.nombre}</span>}
        </button>
      ))}
    </div>
  );
}
