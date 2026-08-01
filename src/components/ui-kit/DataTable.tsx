import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  value?: (row: T) => string | number;
  width?: string;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  pageSize = 8,
  searchable = true,
  empty = "Sin registros",
}: {
  rows: T[];
  columns: Column<T>[];
  pageSize?: number;
  searchable?: boolean;
  empty?: string;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const val = (row: T, col: Column<T>) => col.value?.(row) ?? (row as Record<string, unknown>)[col.key];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = rows;
    if (term) {
      out = rows.filter((r) =>
        columns.some((c) => String(val(r, c) ?? "").toLowerCase().includes(term)),
      );
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        out = [...out].sort((a, b) =>
          String(val(a, col) ?? "").localeCompare(String(val(b, col) ?? ""), "es", { numeric: true }) * sort.dir,
        );
      }
    }
    return out;
  }, [rows, columns, q, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = filtered.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="rounded-xl border bg-card">
      {searchable && (
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar…"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined} className="px-4 py-2">
                <button
                  onClick={() =>
                    setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))
                  }
                  className="label-xs flex items-center gap-1 hover:text-primary"
                >
                  {c.header}
                  {sort?.key === c.key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slice.map((row) => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-accent/50">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2.5 text-[13px]">
                  {c.render ? c.render(row) : String(val(row, c) ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {slice.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            {filtered.length} registros · página {current + 1} de {pages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, current - 1))}
              className="rounded-md border p-1 hover:border-primary hover:text-primary"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setPage(Math.min(pages - 1, current + 1))}
              className="rounded-md border p-1 hover:border-primary hover:text-primary"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
