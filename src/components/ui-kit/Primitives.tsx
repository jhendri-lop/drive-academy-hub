import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 transition-all",
        hover && "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Panel hover className="flex items-start justify-between">
      <div>
        <p className="label-xs">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <span className="rounded-lg bg-primary/12 p-2 text-primary">
        <Icon size={18} />
      </span>
    </Panel>
  );
}

export function PhaseButton({
  fase,
  estado,
  onClick,
}: {
  fase: number;
  estado: "completado" | "activo" | "inactivo";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={estado === "inactivo"}
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors",
        estado === "activo" && "border-primary bg-primary text-primary-foreground",
        estado === "completado" && "border-success/40 bg-success/15 text-success",
        estado === "inactivo" && "cursor-not-allowed border-border text-muted-foreground opacity-50",
      )}
    >
      Fase {fase}
    </button>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "success" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "success" && "bg-success/15 text-success",
        tone === "warning" && "bg-warning/20 text-warning",
      )}
    >
      {children}
    </span>
  );
}
