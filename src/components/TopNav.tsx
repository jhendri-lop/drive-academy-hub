import { Link } from "@tanstack/react-router";
import { CalendarDays, GraduationCap, LayoutDashboard, Settings, Wallet } from "lucide-react";
import { useApp } from "@/lib/store";
import { ColorPicker, ThemeToggle } from "./ui-kit/Theme";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/cursos", label: "Cursos", icon: GraduationCap },
  { to: "/caja", label: "Caja", icon: Wallet },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

export function TopNav() {
  const usuario = useApp((s) => s.usuario);
  const escuela = useApp((s) => s.config.escuela);
  const fecha = new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-40 border-b bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 min-w-[1024px] items-center gap-6 px-6">
        <Link to="/" className="flex items-center gap-2.5">
          {escuela.logoUrl ? (
            <img src={escuela.logoUrl} alt="Logo" className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap size={17} />
            </span>
          )}
          <span className="text-[15px] font-semibold tracking-tight">{escuela.nombre}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: "exact" in rest ? rest.exact : false }}
              activeProps={{ className: "bg-primary/12 text-primary" }}
              inactiveProps={{ className: "text-muted-foreground hover:bg-accent hover:text-foreground" }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ColorPicker compact />
          <ThemeToggle />
          <div className="border-l pl-3 text-right leading-tight">
            <p className="text-[12px] font-medium">{usuario}</p>
            <p className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
              <CalendarDays size={11} /> {fecha}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
