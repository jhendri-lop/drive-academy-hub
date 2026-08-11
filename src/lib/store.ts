import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Config, Curso, Estudiante, Recibo } from "./types";
import { FuzzySearchService } from "@/infrastructure/search/FuzzySearchService";

import { SQLiteCourseRepository } from "@/infrastructure/database/repositories/SQLiteCourseRepository";
import { SQLiteStudentRepository } from "@/infrastructure/database/repositories/SQLiteStudentRepository";

const hoy = new Date().toISOString().slice(0, 10);

const defaultConfig: Config = {
  escuela: {
    nombre: "Zentriumph-DriveOfice",
    ruc: "1791234567001",
    sucursal: "Matriz",
    direccion: "Av. Amazonas N34-120",
    ciudad: "Quito",
    canton: "Quito",
    telefono: "02 250 4477",
    correo: "info@driveacademy.ec",
    resolucion: "18 DCTS-ANT-2013",
    logoUrl: "/logo.jpg",
  },
  firmas: {
    director: { nombre: "Ing. Marco Villacís", cargo: "Director General" },
    secretaria: { nombre: "Lcda. Andrea Suárez", cargo: "Secretaria" },
    directorAnt: { nombre: "Dr. Luis Paredes", cargo: "Director ANT" },
    representante: { nombre: "Sr. Jorge Bastidas", cargo: "Representante Legal" },
  },
  instructores: [
    { id: "i1", nombre: "Francisco Ortuño", cedula: "1718293045", tipo: "Teórico", materiaTeorica: "Educación Vial", telefono: "0991234567" },
    { id: "i2", nombre: "Mario Peralvo", cedula: "1715432189", tipo: "Teórico", materiaTeorica: "Mecánica Básica", telefono: "0998877665" },
    { id: "i3", nombre: "Dr. Rafael Parra", cedula: "1709876543", tipo: "Teórico", materiaTeorica: "Primeros Auxilios", telefono: "0981122334" },
    { id: "i4", nombre: "Luis De La Torre", cedula: "1711223344", tipo: "Teórico", materiaTeorica: "Psicología", telefono: "0975544332" },
    { id: "i5", nombre: "Diana Moreta", cedula: "1712345678", tipo: "Práctico", telefono: "0987654321" },
    { id: "i6", nombre: "Pedro Cajas", cedula: "1701928374", tipo: "Práctico", telefono: "0961122334" },
  ],
  vehiculos: [
    { id: "v1", numero: "01", placas: "PCA-1234", modelo: "Chevrolet Aveo 2021" },
    { id: "v2", numero: "02", placas: "PBX-5566", modelo: "Kia Rio 2022" },
    { id: "v3", numero: "03", placas: "PDG-8899", modelo: "Hyundai Accent 2020" },
  ],
  precios: { A: 250, A1: 300, B: 420, C: 560, C1: 600, D: 680, E: 780, F: 500, G: 550, Psicosensometrico: 35 },
  secuenciales: { recibos: 1001, actas: 200, oficios: 350 },
  logoDocs: { recibo: true, oficios: true, fichas: true, actas: true, certificados: true, listados: false },
  watermarkDocs: {},
  watermark: false,
};

const cursosDemo: Curso[] = [];
const estudiantesDemo: Estudiante[] = [];
const recibosDemo: Recibo[] = [];

export type Palette = "azul" | "verde" | "naranja" | "rojo";

interface AppState {
  theme: "dark" | "light";
  palette: Palette;
  usuario: string;
  cursos: Curso[];
  estudiantes: Estudiante[];
  recibos: Recibo[];
  config: Config;
  setTheme: (t: "dark" | "light") => void;
  setPalette: (p: Palette) => void;
  addCurso: (c: Omit<Curso, "id">) => void;
  updateCurso: (id: string, c: Partial<Curso>) => void;
  deleteCurso: (id: string) => void;
  setFase: (cursoId: string, fase: 1 | 2 | 3 | 4) => void;
  addEstudiante: (e: Omit<Estudiante, "id" | "reciboNumero" | "fecha">) => Estudiante;
  updateEstudiante: (id: string, e: Partial<Estudiante>) => void;
  deleteEstudiante: (id: string) => void;
  addRecibo: (r: Omit<Recibo, "id" | "numero" | "fecha">) => void;
  updateConfig: (c: Partial<Config>) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      palette: "azul",
      usuario: "Andrea Suárez",
      cursos: cursosDemo,
      estudiantes: estudiantesDemo,
      recibos: recibosDemo,
      config: defaultConfig,
      setTheme: (theme) => set({ theme }),
      setPalette: (palette) => set({ palette }),
      addCurso: (c) => {
        const id = crypto.randomUUID();
        const nuevoCurso = { ...c, id };
        set((s) => {
          const cursos = [...s.cursos, nuevoCurso];
          const newConfig = c.customDocsRoot ? { ...s.config, customDocsRoot: c.customDocsRoot } : s.config;
          FuzzySearchService.getInstance().setDataset(s.estudiantes, cursos);
          return { cursos, config: newConfig };
        });
      },
      updateCurso: (id, c) =>
        set((s) => {
          const cursos = s.cursos.map((x) => (x.id === id ? { ...x, ...c } : x));
          const newConfig = c.customDocsRoot ? { ...s.config, customDocsRoot: c.customDocsRoot } : s.config;
          FuzzySearchService.getInstance().setDataset(s.estudiantes, cursos);
          return { cursos, config: newConfig };
        }),
      deleteCurso: (id) => {
        try {
          const sqliteCourseRepo = new SQLiteCourseRepository();
          const sqliteStudentRepo = new SQLiteStudentRepository();
          sqliteCourseRepo.delete(id).catch((e) => console.warn("Error eliminando curso en SQLite:", e));
          const studentsToDelete = get().estudiantes.filter((e) => e.cursoId === id || String(e.cursoId) === String(id));
          studentsToDelete.forEach((st) => {
            sqliteStudentRepo.delete(st.id).catch((e) => console.warn("Error eliminando estudiante de curso en SQLite:", e));
          });
        } catch (err) {
          console.warn("Excepción sqlite deleteCurso:", err);
        }

        set((s) => {
          const cursos = s.cursos.filter((x) => x.id !== id && String(x.id) !== String(id));
          const estudiantes = s.estudiantes.filter((e) => e.cursoId !== id && String(e.cursoId) !== String(id));
          FuzzySearchService.getInstance().setDataset(estudiantes, cursos);
          return { cursos, estudiantes };
        });
      },
      setFase: (cursoId, fase) =>
        set((s) => ({
          cursos: s.cursos.map((c) => (c.id === cursoId ? { ...c, faseActual: fase } : c)),
        })),
      addEstudiante: (e) => {
        const numero = get().config.secuenciales.recibos + get().recibos.length;
        const nuevo: Estudiante = {
          ...e,
          id: crypto.randomUUID(),
          reciboNumero: numero,
          fecha: new Date().toISOString().slice(0, 10),
        };
        const curso = get().cursos.find((c) => c.id === e.cursoId);
        set((s) => {
          const estudiantes = [...s.estudiantes, nuevo];
          FuzzySearchService.getInstance().setDataset(estudiantes, s.cursos);
          return {
            estudiantes,
            recibos: [
              ...s.recibos,
              {
                id: crypto.randomUUID(),
                numero,
                estudiante: e.nombres,
                cedula: e.cedula,
                concepto: e.concepto,
                monto: e.abono,
                metodo: e.formaPago,
                curso: curso?.nombre ?? "—",
                fecha: nuevo.fecha,
                comprobante: e.comprobante,
              },
            ],
          };
        });
        return nuevo;
      },
      updateEstudiante: (id, e) =>
        set((s) => {
          const estudiantes = s.estudiantes.map((x) => (x.id === id ? { ...x, ...e } : x));
          FuzzySearchService.getInstance().setDataset(estudiantes, s.cursos);
          return { estudiantes };
        }),
      deleteEstudiante: (id) => {
        try {
          const sqliteStudentRepo = new SQLiteStudentRepository();
          sqliteStudentRepo.delete(id).catch((e) => console.warn("Error eliminando estudiante en SQLite:", e));
        } catch (err) {
          console.warn("Excepción sqlite deleteEstudiante:", err);
        }

        set((s) => {
          const estudiantes = s.estudiantes.filter((x) => x.id !== id && String(x.id) !== String(id));
          FuzzySearchService.getInstance().setDataset(estudiantes, s.cursos);
          return { estudiantes };
        });
      },
      addRecibo: (r) =>
        set((s) => ({
          recibos: [
            ...s.recibos,
            {
              ...r,
              id: crypto.randomUUID(),
              numero: s.config.secuenciales.recibos + s.recibos.length,
              fecha: new Date().toISOString().slice(0, 10),
            },
          ],
        })),
      updateConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
    }),
    {
      name: "zentriumph-driveofice",
      onRehydrateStorage: () => (state) => {
        if (state) {
          FuzzySearchService.getInstance().setDataset(state.estudiantes, state.cursos);
        }
      },
    },
  ),
);
