export type TipoLicencia = "A" | "A1" | "B" | "C" | "C1" | "D" | "E" | "F" | "G";
export type FormaPago = "Efectivo" | "Transferencia" | "Tarjeta";

export interface Instructor {
  id: string;
  nombre: string;
  cedula: string;
  tipo: "Teórico" | "Práctico";
  telefono: string;
  materiaTeorica?: "Educación Vial" | "Mecánica Básica" | "Primeros Auxilios" | "Psicología" | string;
}

export interface Vehiculo {
  id: string;
  numero: string;
  placas: string;
  modelo: string;
  instructorId?: string;
  instructorNombre?: string;
}

export interface Estudiante {
  id: string;
  cursoId: string;
  nombres: string;
  cedula: string;
  tipoDocumento?: "Cédula" | "Pasaporte";
  nacionalidad: string;
  tipoSangre: string;
  rh: string;
  sexo: string;
  fechaNacimiento: string;
  edad: number;
  direccion: string;
  canton: string;
  celular: string;
  correo: string;
  horarioTeoria?: string;
  horarioPractica: string;
  vehiculoId: string;
  instructorPracticoId: string;
  concepto: string;
  valorTotal: number;
  abono: number;
  saldo: number;
  formaPago: FormaPago;
  comprobante: string;
  comprobanteImg?: string;
  fotoUrl: string;
  nivelInstruccion: string;
  observaciones: string;
  lentes?: string;
  fechaMatricula?: string;
  estado: "Activo" | "Retirado" | "Graduado";
  reciboNumero: number;
  numeroPermiso?: string;
  fecha: string;
}

export interface Curso {
  id: string;
  nombre: string;
  tipoLicencia: TipoLicencia;
  inicioMatriculas: string;
  finMatriculas: string;
  inicioCurso: string;
  finCurso: string;
  horarioTeoria: string;
  horarioPractica: string;
  horarioPsicologia: string;
  instructorTeoricoId?: string;
  vehiculosIds: string[];
  oficioInicial?: number;
  customDocsRoot?: string;
  faseActual: 1 | 2 | 3 | 4;
  estado: "Matrículas" | "En curso" | "Finalizado";
}

export interface Recibo {
  id: string;
  numero: number;
  estudiante: string;
  cedula: string;
  concepto: string;
  monto: number;
  metodo: FormaPago;
  curso: string;
  fecha: string;
  comprobante?: string;
  comprobanteImg?: string;
}

export interface Config {
  escuela: {
    nombre: string;
    ruc: string;
    sucursal: string;
    direccion: string;
    ciudad: string;
    canton: string;
    telefono: string;
    correo: string;
    resolucion: string;
    logoUrl: string;
  };
  firmas: Record<string, { nombre: string; cargo: string }>;
  instructores: Instructor[];
  vehiculos: Vehiculo[];
  precios: Record<string, number>;
  secuenciales: { recibos: number; actas: number; oficios: number };
  logoDocs: Record<string, boolean>;
  watermarkDocs: Record<string, boolean>;
  watermark: boolean;
  customDocsRoot?: string;
}

export const TIPOS_SANGRE = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"];
export const NIVELES = ["Bachiller", "Superior", "Básica", "Primaria", "Otro"];
export const NACIONALIDADES = ["Ecuatoriana", "Colombiana", "Peruana", "Venezolana", "Otra"];
