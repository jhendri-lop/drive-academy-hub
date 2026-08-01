export type TipoLicencia = "B" | "C" | "D" | "E" | "F";
export type FormaPago = "Efectivo" | "Transferencia" | "Tarjeta";

export interface Instructor {
  id: string;
  nombre: string;
  cedula: string;
  tipo: "Teórico" | "Práctico";
  telefono: string;
}

export interface Vehiculo {
  id: string;
  numero: string;
  placas: string;
  modelo: string;
}

export interface Estudiante {
  id: string;
  cursoId: string;
  nombres: string;
  cedula: string;
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
  horarioPractica: string;
  vehiculoId: string;
  instructorPracticoId: string;
  concepto: string;
  valorTotal: number;
  abono: number;
  saldo: number;
  formaPago: FormaPago;
  comprobante: string;
  fotoUrl: string;
  nivelInstruccion: string;
  observaciones: string;
  estado: "Activo" | "Retirado" | "Graduado";
  reciboNumero: number;
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
  instructorTeoricoId: string;
  vehiculosIds: string[];
  oficioInicial: number;
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
  firmas: Record<
    "director" | "secretaria" | "directorAnt" | "representante",
    { nombre: string; cargo: string }
  >;
  instructores: Instructor[];
  vehiculos: Vehiculo[];
  precios: Record<string, number>;
  secuenciales: { recibos: number; actas: number; oficios: number };
  logoDocs: Record<string, boolean>;
  watermark: boolean;
}

export const TIPOS_SANGRE = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"];
export const NIVELES = ["Bachiller", "Superior", "Básica", "Primaria", "Otro"];
export const NACIONALIDADES = ["Ecuatoriana", "Colombiana", "Peruana", "Venezolana", "Otra"];
