import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Config, Curso, Estudiante, Recibo } from "./types";

const hoy = new Date().toISOString().slice(0, 10);

const defaultConfig: Config = {
  escuela: {
    nombre: "Drive Academy",
    ruc: "1791234567001",
    sucursal: "Matriz",
    direccion: "Av. Amazonas N34-120",
    ciudad: "Quito",
    canton: "Quito",
    telefono: "02 250 4477",
    correo: "info@driveacademy.ec",
    resolucion: "ANT-DE-2024-0187",
    logoUrl: "",
  },
  firmas: {
    director: { nombre: "Ing. Marco Villacís", cargo: "Director General" },
    secretaria: { nombre: "Lcda. Andrea Suárez", cargo: "Secretaria" },
    directorAnt: { nombre: "Dr. Luis Paredes", cargo: "Director ANT" },
    representante: { nombre: "Sr. Jorge Bastidas", cargo: "Representante Legal" },
  },
  instructores: [
    { id: "i1", nombre: "Carlos Andrade", cedula: "1718293045", tipo: "Teórico", telefono: "0991234567" },
    { id: "i2", nombre: "Diana Moreta", cedula: "1712345678", tipo: "Práctico", telefono: "0987654321" },
    { id: "i3", nombre: "Pedro Cajas", cedula: "1701928374", tipo: "Práctico", telefono: "0961122334" },
  ],
  vehiculos: [
    { id: "v1", numero: "01", placas: "PCA-1234", modelo: "Chevrolet Aveo 2021" },
    { id: "v2", numero: "02", placas: "PBX-5566", modelo: "Kia Rio 2022" },
    { id: "v3", numero: "03", placas: "PDG-8899", modelo: "Hyundai Accent 2020" },
  ],
  precios: { B: 420, C: 560, D: 680, E: 780, F: 500, Psicosensometrico: 35 },
  secuenciales: { recibos: 1001, actas: 200, oficios: 350 },
  logoDocs: { recibo: true, oficios: true, fichas: true, actas: true, certificados: true, listados: false },
  watermark: false,
};

const cursosDemo: Curso[] = [
  {
    id: "c1",
    nombre: "Curso B-2026-01",
    tipoLicencia: "B",
    inicioMatriculas: "2026-07-01",
    finMatriculas: "2026-07-20",
    inicioCurso: "2026-07-25",
    finCurso: "2026-09-25",
    horarioTeoria: "Lunes a Viernes 18H00-20H00",
    horarioPractica: "14H00-16H00",
    horarioPsicologia: "Sábado 08H00-12H00",
    instructorTeoricoId: "i1",
    vehiculosIds: ["v1", "v2"],
    oficioInicial: 350,
    faseActual: 2,
    estado: "En curso",
  },
  {
    id: "c2",
    nombre: "Curso C-2026-02",
    tipoLicencia: "C",
    inicioMatriculas: "2026-08-01",
    finMatriculas: "2026-08-22",
    inicioCurso: "2026-08-28",
    finCurso: "2026-11-05",
    horarioTeoria: "Sábados 08H00-13H00",
    horarioPractica: "09H00-11H00",
    horarioPsicologia: "Sábado 08H00-12H00",
    instructorTeoricoId: "i1",
    vehiculosIds: ["v3"],
    oficioInicial: 372,
    faseActual: 1,
    estado: "Matrículas",
  },
];

const estudiantesDemo: Estudiante[] = [
  {
    id: "e1",
    cursoId: "c1",
    nombres: "María Fernanda Loor",
    cedula: "1723456789",
    nacionalidad: "Ecuatoriana",
    tipoSangre: "O+",
    rh: "Positivo",
    sexo: "Femenino",
    fechaNacimiento: "1998-04-12",
    edad: 28,
    direccion: "Calle Los Ríos 234",
    canton: "Quito",
    celular: "0998877665",
    correo: "mf.loor@gmail.com",
    horarioPractica: "14H00-16H00",
    vehiculoId: "v1",
    instructorPracticoId: "i2",
    concepto: "Curso Tipo B",
    valorTotal: 420,
    abono: 200,
    saldo: 220,
    formaPago: "Efectivo",
    comprobante: "",
    fotoUrl: "",
    nivelInstruccion: "Superior",
    observaciones: "",
    estado: "Activo",
    reciboNumero: 1001,
    fecha: hoy,
  },
  {
    id: "e2",
    cursoId: "c1",
    nombres: "Juan Carlos Pérez",
    cedula: "1712233445",
    nacionalidad: "Ecuatoriana",
    tipoSangre: "A+",
    rh: "Positivo",
    sexo: "Masculino",
    fechaNacimiento: "1995-11-30",
    edad: 30,
    direccion: "Av. 6 de Diciembre 1122",
    canton: "Quito",
    celular: "0977665544",
    correo: "jc.perez@gmail.com",
    horarioPractica: "16H00-18H00",
    vehiculoId: "v2",
    instructorPracticoId: "i3",
    concepto: "Curso Tipo B",
    valorTotal: 420,
    abono: 420,
    saldo: 0,
    formaPago: "Transferencia",
    comprobante: "TRF-99231",
    fotoUrl: "",
    nivelInstruccion: "Bachiller",
    observaciones: "Cancela completo",
    estado: "Activo",
    reciboNumero: 1002,
    fecha: hoy,
  },
];

const recibosDemo: Recibo[] = [
  {
    id: "r1",
    numero: 1001,
    estudiante: "María Fernanda Loor",
    cedula: "1723456789",
    concepto: "Curso Tipo B",
    monto: 200,
    metodo: "Efectivo",
    curso: "Curso B-2026-01",
    fecha: hoy,
  },
  {
    id: "r2",
    numero: 1002,
    estudiante: "Juan Carlos Pérez",
    cedula: "1712233445",
    concepto: "Curso Tipo B",
    monto: 420,
    metodo: "Transferencia",
    curso: "Curso B-2026-01",
    fecha: hoy,
    comprobante: "TRF-99231",
  },
];

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
  setFase: (cursoId: string, fase: 1 | 2 | 3 | 4) => void;
  addEstudiante: (e: Omit<Estudiante, "id" | "reciboNumero" | "fecha">) => Estudiante;
  updateEstudiante: (id: string, e: Partial<Estudiante>) => void;
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
      addCurso: (c) => set((s) => ({ cursos: [...s.cursos, { ...c, id: crypto.randomUUID() }] })),
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
        set((s) => ({
          estudiantes: [...s.estudiantes, nuevo],
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
        }));
        return nuevo;
      },
      updateEstudiante: (id, e) =>
        set((s) => ({
          estudiantes: s.estudiantes.map((x) => (x.id === id ? { ...x, ...e } : x)),
        })),
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
    { name: "drive-academy" },
  ),
);
