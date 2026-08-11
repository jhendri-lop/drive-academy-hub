import { Link } from "react-router-dom";
import { useState } from "react";
import { CalendarClock, DollarSign, GraduationCap, Plus, Search, Users, User, BookOpen } from "lucide-react";
import { useApp } from "@/lib/store";
import { Badge, Panel, PhaseButton, StatCard } from "@/components/ui-kit/Primitives";
import { CrearCursoModal } from "@/components/CrearCursoModal";
import { FuzzySearchService, type SearchableItem } from "@/infrastructure/search/FuzzySearchService";

export default function Dashboard() {
  const { cursos, estudiantes, recibos } = useApp();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchableItem[]>([]);

  const hoy = new Date().toISOString().slice(0, 10);
  const ingresosHoy = recibos.filter((r) => r.fecha === hoy).reduce((a, r) => a + r.monto, 0);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim().length >= 2) {
      const res = FuzzySearchService.getInstance().search(q);
      setSearchResults(res);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[12px] text-muted-foreground">Resumen operativo de la escuela</p>
        </div>

        <div className="relative w-96">
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar estudiante por nombre, cédula o curso..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-surface pl-9 pr-4 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-11 z-50 max-h-72 overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
              {searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No se encontraron resultados para "{searchQuery}"
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {searchResults.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={item.type === "estudiante" ? `/cursos/${item.original.cursoId}` : `/cursos/${item.id}`}
                      onClick={() => setSearchQuery("")}
                      className="flex items-center gap-3 p-2.5 hover:bg-accent transition-colors"
                    >
                      {item.type === "estudiante" ? (
                        <User className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">
                          {item.type === "estudiante" ? item.fullName : item.courseName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.type === "estudiante"
                            ? `Cédula: ${item.cedula} · ${item.courseName}`
                            : `Curso de conducción`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={GraduationCap} label="Cursos Activos" value={cursos.filter((c) => c.estado !== "Finalizado").length} hint={`${cursos.length} en total`} />
        <StatCard icon={Users} label="Estudiantes Totales" value={estudiantes.length} hint="Matriculados" />
        <StatCard icon={DollarSign} label="Ingresos Hoy" value={`$${ingresosHoy.toFixed(2)}`} hint={`${recibos.filter((r) => r.fecha === hoy).length} recibos`} />
        <StatCard icon={CalendarClock} label="Exámenes Próximos" value={cursos.filter((c) => c.faseActual >= 3).length} hint="Fase 3 o superior" />
      </div>

      <Panel className="p-0">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-[14px] font-semibold">Cursos recientes</h2>
          <Link to="/cursos" className="btn-3d-secondary rounded-full px-3 py-1 text-[11px] font-semibold">
            Ver todos →
          </Link>
        </div>
        <div className="divide-y">
          {cursos.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-52">
                <p className="text-[13px] font-medium">{c.nombre}</p>
                <p className="text-[11px] text-muted-foreground">
                  Licencia {c.tipoLicencia} · {c.inicioCurso} → {c.finCurso}
                </p>
              </div>
              <Badge tone={c.estado === "En curso" ? "success" : c.estado === "Matrículas" ? "warning" : "muted"}>{c.estado}</Badge>
              <Badge tone="primary">Fase {c.faseActual}</Badge>
              <span className="text-[12px] text-muted-foreground">
                {estudiantes.filter((e) => e.cursoId === c.id).length} alumnos
              </span>
              <Link
                to={`/cursos/${c.id}`}
                className="btn-3d-secondary ml-auto rounded-full px-3 py-1 text-[11px] font-semibold"
              >
                Ver estudiantes →
              </Link>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((f) => (
          <PhaseButton key={f} fase={f} estado="inactivo" />
        ))}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-8 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[13px] font-semibold text-primary-foreground shadow-panel transition-transform hover:scale-105"
      >
        <Plus size={16} /> Nuevo Curso
      </button>

      <CrearCursoModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
