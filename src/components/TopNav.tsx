import { Link, NavLink } from "react-router-dom";
import { CalendarDays, GraduationCap, LayoutDashboard, Settings, Wallet, LogOut } from "lucide-react";
import { useApp } from "@/lib/store";
import { ColorPicker, ThemeToggle } from "./ui-kit/Theme";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cursos", label: "Cursos", icon: GraduationCap },
  { to: "/caja", label: "Caja", icon: Wallet },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

export function TopNav() {
  const escuela = useApp((s) => s.config.escuela);
  const logout = useApp((s) => s.logout);
  const sesion = useApp((s) => s.sesion);

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
          <img src={escuela.logoUrl || "/logo.jpg"} alt="Logo" className="h-8 w-8 rounded-full object-cover shadow-sm border border-primary/20" />
          <span className="text-[15px] font-semibold tracking-tight">{escuela.nombre}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-primary/12 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ColorPicker compact />
          <ThemeToggle />
          <div className="border-l pl-3 text-right leading-tight flex items-center gap-3">
            <div>
              <p className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                <CalendarDays size={11} /> {fecha}
              </p>
              {sesion?.email && (
                <p className="text-[10px] text-primary/80 font-mono text-right">{sesion.email}</p>
              )}
            </div>
            <button
              onClick={() => logout()}
              title="Cerrar Sesión"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
