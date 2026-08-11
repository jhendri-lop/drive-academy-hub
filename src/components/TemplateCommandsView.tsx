import React, { useState } from "react";
import {
  Copy,
  Check,
  Terminal,
  User,
  BookOpen,
  Building2,
  PenLine,
  Car,
  FileCheck,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Panel } from "@/components/ui-kit/Primitives";

interface CommandItem {
  tag: string;
  description: string;
  example?: string;
  format?: "Word" | "Excel" | "Ambos";
}

interface CommandCategory {
  id: string;
  title: string;
  icon: typeof User;
  description: string;
  commands: CommandItem[];
}

const CATEGORIES: CommandCategory[] = [
  {
    id: "estudiante",
    title: "1. Datos del Estudiante",
    icon: User,
    description: "Atributos personales, identificación y contacto de cada alumno matriculado.",
    commands: [
      { tag: "{estudianteNombre}", description: "Apellidos y Nombres completos en mayúsculas", example: "ANDRADE GAVILANES JOSSET AILEEN", format: "Ambos" },
      { tag: "{cedula}", description: "Número de Cédula o Pasaporte", example: "1755589577", format: "Ambos" },
      { tag: "{tipoDocumento}", description: "Tipo de Documento de Identificación (Cédula o Pasaporte)", example: "Cédula", format: "Ambos" },
      { tag: "{tipoDocumentoCorta}", description: "Abreviatura de tipo de documento (CC. o PAS.)", example: "CC.", format: "Ambos" },
      { tag: "{X1}", description: "Marca una 'X' si el documento es Cédula (o vacio si es Pasaporte)", example: "X", format: "Ambos" },
      { tag: "{X2}", description: "Marca una 'X' si el documento es Pasaporte (o vacio si es Cédula)", example: " ", format: "Ambos" },
      { tag: "{nacionalidad}", description: "Nacionalidad del alumno", example: "ECUATORIANA", format: "Ambos" },
      { tag: "{tipoSangre}", description: "Tipo de sangre con RH", example: "ARH+", format: "Ambos" },
      { tag: "{fechaNacimiento}", description: "Fecha de nacimiento formateada (numérica)", example: "17/07/2003", format: "Ambos" },
      { tag: "{fechaNacimientoLarga}", description: "Fecha de nacimiento formateada con texto (día-mes-año)", example: "29-mayo-2008", format: "Ambos" },
      { tag: "{edad}", description: "Edad calculada en años", example: "18", format: "Ambos" },
      { tag: "{sexo}", description: "Sexo / Género (M o F)", example: "F", format: "Ambos" },
      { tag: "{direccion}", description: "Dirección de Domicilio", example: "CARAPUNGO", format: "Ambos" },
      { tag: "{canton}", description: "Cantón de residencia", example: "QUITO", format: "Ambos" },
      { tag: "{celular}", description: "Número de teléfono celular", example: "0964022342-", format: "Ambos" },
      { tag: "{email}", description: "Correo electrónico de contacto", example: "jossetandrade@gmail.com", format: "Ambos" },
      { tag: "{nivelInstruccion}", description: "Nivel de instrucción del alumno", example: "BACHILLER", format: "Ambos" },
      { tag: "{lentes}", description: "Uso de lentes por el alumno (SÍ o NO, por defecto NO)", example: "NO", format: "Ambos" },
      { tag: "{marcaLentes}", description: "Marca de casilla si usa lentes ( X ) o (   )", example: "(   )", format: "Ambos" },
      { tag: "{fechaMatricula}", description: "Fecha de matrícula del estudiante", example: "10/07/2026", format: "Ambos" },
      { tag: "{observaciones}", description: "Observaciones adicionales escritas al inscribir el alumno", example: "ADJUNTA CERTIFICADO DE BACHILLER", format: "Ambos" },
      { tag: "{numeroPermiso}", description: "Número de Permiso de Aprendizaje del estudiante (toma el valor numérico asignado en Permisos ANT o '0' si está en cero/pendiente)", example: "10001", format: "Ambos" },
      { tag: "{permisoAprendizaje}", description: "Número de Permiso de Aprendizaje (alias alternativo de {numeroPermiso})", example: "10001", format: "Ambos" },
      { tag: "{primerUltimoEstudiante}", description: "Rango de primer al último estudiante en orden alfabético con Cédula", example: "ACERO CEVALLOS KEVIN ALEXANDER CC. 1725219412 hasta VALENCIA GUAICO ZAHID MIJAEL CC. 1753673837", format: "Ambos" },
    ],
  },
  {
    id: "curso",
    title: "2. Datos del Curso y Horarios",
    icon: BookOpen,
    description: "Identificación del curso, tipo de licencia, fechas y cronogramas de clases.",
    commands: [
      { tag: "{cursoNombre}", description: "Nombre completo del Curso N°", example: "DAIC 020 2026", format: "Ambos" },
      { tag: "{tipoLicencia}", description: "Tipo de Licencia de Conducción (A, A1, B, C, C1, D, E, F, G)", example: "A / A1 / B / C / C1 / D / E / F / G", format: "Ambos" },
      { tag: "{cantidadEstudiantes}", description: "Cantidad total de estudiantes matriculados (en número)", example: "23", format: "Ambos" },
      { tag: "{cantidadEstudiantesTexto}", description: "Cantidad total de estudiantes en texto en mayúsculas", example: "VEINTITRÉS", format: "Ambos" },
      { tag: "{matriculaInicio}", description: "Fecha de inicio de período de matrículas", example: "13/7/2026", format: "Ambos" },
      { tag: "{matriculaFin}", description: "Fecha de cierre de matrículas", example: "21/7/2026", format: "Ambos" },
      { tag: "{finMatriculasLargo}", description: "Fecha de cierre de matrículas en formato largo (ej. 13 de julio del 2026)", example: "13 de julio del 2026", format: "Ambos" },
      { tag: "{cursoInicio}", description: "Fecha de inicio de clases del curso", example: "27/7/2026", format: "Ambos" },
      { tag: "{cursoFin}", description: "Fecha de fin de clases del curso", example: "4/8/2026", format: "Ambos" },
      { tag: "{cursoFinAnterior}", description: "Fecha calculada exactamente un día antes del fin de curso (ej. si termina el 24/07/2026, sale 23/07/2026)", example: "23/07/2026", format: "Ambos" },
      { tag: "{periodo}", description: "Período de clases en texto formateado (ej. del 16 de julio al 24 de julio del 2026)", example: "del 16 de julio al 24 de julio del 2026", format: "Ambos" },
      { tag: "{fechaActual}", description: "Fecha actual del día en formato largo con texto (día-mesNombre-año)", example: "27-marzo-2026", format: "Ambos" },
      { tag: "{horarioTeorico}", description: "Rango de horario de teoría asignado", example: "20H00-22H00", format: "Ambos" },
      { tag: "{horarioPractico}", description: "Rango de horario práctico asignado", example: "08H00-10H00", format: "Ambos" },
      { tag: "{f1}", description: "Fecha individual de Asistencia - Clase 1", example: "27/07", format: "Ambos" },
      { tag: "{f2}", description: "Fecha individual de Asistencia - Clase 2", example: "28/07", format: "Ambos" },
      { tag: "{f3}", description: "Fecha individual de Asistencia - Clase 3", example: "29/07", format: "Ambos" },
      { tag: "{f4}", description: "Fecha individual de Asistencia - Clase 4", example: "30/07", format: "Ambos" },
      { tag: "{f5}", description: "Fecha individual de Asistencia - Clase 5", example: "31/07", format: "Ambos" },
      { tag: "{f6}", description: "Fecha individual de Asistencia - Clase 6", example: "01/08", format: "Ambos" },
      { tag: "{f7}", description: "Fecha individual de Asistencia - Clase 7", example: "03/08", format: "Ambos" },
      { tag: "{f8}", description: "Fecha individual de Asistencia - Clase 8", example: "04/08", format: "Ambos" },
    ],
  },
  {
    id: "escuela",
    title: "3. Escuela y Resolución ANT",
    icon: Building2,
    description: "Datos institucionales de la Escuela de Conducción y Resolución oficial de la ANT.",
    commands: [
      { tag: "{logoEscuela}", description: "Incrusta el logo oficial cargado desde la pantalla de Configuración en la posición donde se ubique esta etiqueta (Word / Excel)", example: "{logoEscuela}", format: "Ambos" },
      { tag: "{resolucionAnt}", description: "Número de Resolución de aprobación de la ANT", example: "18 DCTS-ANT-2013", format: "Ambos" },
      { tag: "{escuelaNombre}", description: "Nombre de la Escuela de Conducción", example: "Zentriumph-DriveOfice", format: "Ambos" },
      { tag: "{escuelaRuc}", description: "Número de RUC de la institución", example: "1791234567001", format: "Ambos" },
      { tag: "{escuelaSucursal}", description: "Nombre de la Sucursal o Matriz", example: "Matriz", format: "Ambos" },
      { tag: "{escuelaDireccion}", description: "Dirección física de la matriz o sucursal", example: "Av. Amazonas N34-120", format: "Ambos" },
      { tag: "{escuelaCiudad}", description: "Ciudad / Cantón de la escuela", example: "Quito", format: "Ambos" },
      { tag: "{escuelaTelefono}", description: "Teléfono fijo / celular de la escuela", example: "02 250 4477", format: "Ambos" },
      { tag: "{escuelaCorreo}", description: "Correo electrónico institucional", example: "info@driveacademy.ec", format: "Ambos" },
      { tag: "{oficioMatriz}", description: "Número del oficio matriz remitido por la ANT", example: "ANT-DPPIC-2026-6528-OF", format: "Word" },
      { tag: "{fechaOficioMatriz}", description: "Fecha de emisión del oficio matriz", example: "06 de julio 2026", format: "Word" },
      { tag: "{remitenteOficio}", description: "Remitente oficial del oficio matriz ANT", example: "Director De La Dirección Provincial De Pichincha", format: "Word" },
    ],
  },
  {
    id: "firmas",
    title: "4. Instructores y Firmas de Autoridades",
    icon: PenLine,
    description: "Firmas y nombres de los instructores teóricos, prácticos y directivos.",
    commands: [
      { tag: "{instructorPractico}", description: "Nombre del instructor de clases prácticas", example: "Pedro Cajas", format: "Ambos" },
      { tag: "{instructorEdVial}", description: "Instructor de la materia Educación Vial", example: "Francisco Ortuño", format: "Ambos" },
      { tag: "{instructorMecanica}", description: "Instructor de la materia Mecánica Básica", example: "Mario Peralvo", format: "Ambos" },
      { tag: "{instructorPAuxilios}", description: "Instructor de la materia Primeros Auxilios", example: "Dr. Rafael Parra", format: "Ambos" },
      { tag: "{instructorPsicologia}", description: "Instructor de la materia Psicología", example: "Luis De La Torre", format: "Ambos" },
      { tag: "{directorNombre}", description: "Nombre del Director General de la escuela", example: "Ing. Marco Villacís", format: "Ambos" },
      { tag: "{directorCargo}", description: "Cargo del Director General", example: "Director General", format: "Ambos" },
      { tag: "{secretariaNombre}", description: "Nombre de la Secretaria de la escuela", example: "Lcda. Andrea Suárez", format: "Ambos" },
      { tag: "{secretariaCargo}", description: "Cargo de la Secretaria", example: "Secretaria", format: "Ambos" },
      { tag: "{directorAntNombre}", description: "Nombre del Director delegado de la ANT", example: "Dr. Luis Paredes", format: "Ambos" },
      { tag: "{directorAntCargo}", description: "Cargo del Director delegado de la ANT", example: "Director Provincial", format: "Ambos" },
      { tag: "{representanteNombre}", description: "Nombre del Representante Legal", example: "Sr. Jorge Bastidas", format: "Ambos" },
      { tag: "{representanteCargo}", description: "Cargo del Representante Legal", example: "Representante Legal", format: "Ambos" },
    ],
  },
  {
    id: "vehiculo",
    title: "5. Vehículos de Práctica",
    icon: Car,
    description: "Flota de automóviles asignados para las clases prácticas del curso.",
    commands: [
      { tag: "{numeroVehiculo}", description: "Número identificador del auto (ej. 01, 02)", example: "01", format: "Ambos" },
      { tag: "{placaVehiculo}", description: "Placa oficial del vehículo", example: "PCA-1234", format: "Ambos" },
      { tag: "{modeloVehiculo}", description: "Marca y modelo del vehículo", example: "Chevrolet Aveo 2021", format: "Ambos" },
    ],
  },
  {
    id: "documentos",
    title: "6. Actas, Oficios, Notas y Bucles Repetitivos",
    icon: FileCheck,
    description: "Secuenciales de oficios, actas de calificaciones y control de páginas repetitivas.",
    commands: [
      { tag: "{#estudiantes}", description: "[INICIO BUCLE] Colocar antes de la primera etiqueta en la celda inicial (Word / Excel)", example: "{#estudiantes}", format: "Ambos" },
      { tag: "{/estudiantes}", description: "[FIN BUCLE] Colocar al final de la última etiqueta en la celda final (Word / Excel)", example: "{/estudiantes}", format: "Ambos" },
      { tag: "{n}", description: "[EXCEL] Número correlativo de fila de alumno (1, 2, 3...)", example: "1", format: "Excel" },
      { tag: "{oficioNumero}", description: "Número de oficio secuencial asignado", example: "2026-1151", format: "Ambos" },
      { tag: "{numeroTramite}", description: "Número de trámite de ingreso de matriculados ANT", example: "TR-ANT-2026-099", format: "Ambos" },
      { tag: "{actaNumero}", description: "Número de acta de calificaciones", example: "ACT-200-2026", format: "Ambos" },
      { tag: "{fechaEmision}", description: "Fecha de emisión en formato texto largo", example: "22 de julio del 2026", format: "Ambos" },
      { tag: "{fechaEmisionCorta}", description: "Fecha de emisión en formato numérico corto", example: "22/07/2026", format: "Ambos" },
      { tag: "{notaTeoria}", description: "Calificación o nota final teórica", example: "19.50", format: "Ambos" },
      { tag: "{notaPractica}", description: "Calificación o nota final práctica", example: "20.00", format: "Ambos" },
      { tag: "{notaPromedio}", description: "Promedio acumulado final", example: "19.75", format: "Ambos" },
      { tag: "{notaEdVial}", description: "Calificación o nota de la materia Educación Vial", example: "20.00", format: "Ambos" },
      { tag: "{notaMecanica}", description: "Calificación o nota de la materia Mecánica Básica", example: "20.00", format: "Ambos" },
      { tag: "{notaPAuxilios}", description: "Calificación o nota de la materia Primeros Auxilios", example: "20.00", format: "Ambos" },
      { tag: "{notaPsicologia}", description: "Calificación o nota de la materia Psicología", example: "20.00", format: "Ambos" },
    ],
  },
];

export function TemplateCommandsView() {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("todas");

  const firmasConfig: Record<string, { nombre?: string; cargo?: string }> = useApp((s) => s.config.firmas || {});

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast.success(`Copiado al portapapeles: ${tag}`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  // Construir categorías dinámicas incluyendo puestos personalizados de Directiva
  const categories: CommandCategory[] = CATEGORIES.map((cat) => {
    if (cat.id === "firmas") {
      // Generar comandos dinámicos para todos los puestos en config.firmas
      const firmasCmds: CommandItem[] = [
        { tag: "{instructorPractico}", description: "Nombre del instructor de clases prácticas", example: "Pedro Cajas", format: "Ambos" },
        { tag: "{instructorEdVial}", description: "Instructor de la materia Educación Vial", example: "Francisco Ortuño", format: "Ambos" },
        { tag: "{instructorMecanica}", description: "Instructor de la materia Mecánica Básica", example: "Mario Peralvo", format: "Ambos" },
        { tag: "{instructorPAuxilios}", description: "Instructor de la materia Primeros Auxilios", example: "Dr. Rafael Parra", format: "Ambos" },
        { tag: "{instructorPsicologia}", description: "Instructor de la materia Psicología", example: "Luis De La Torre", format: "Ambos" },
      ];

      Object.entries(firmasConfig).forEach(([key, val]) => {
        firmasCmds.push(
          {
            tag: `{${key}Nombre}`,
            description: `Nombre de Directiva (${val.cargo || key})`,
            example: val.nombre || "Nombre",
            format: "Ambos",
          },
          {
            tag: `{${key}Cargo}`,
            description: `Cargo de Directiva (${val.cargo || key})`,
            example: val.cargo || "Cargo",
            format: "Ambos",
          }
        );
      });

      return {
        ...cat,
        commands: firmasCmds,
      };
    }
    return cat;
  });

  const totalCount = categories.reduce((acc, cat) => acc + cat.commands.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Catálogo General de Comandos y Etiquetas para Plantillas
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Copia los marcadores e insértalos directamente en tus archivos de **Word (.docx)** o **Excel (.xlsx)** de cualquier fase.
          </p>
        </div>

        {/* Buscador */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar etiqueta (ej. cedula, nombre)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Filtros rápidos por Categoría */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setSelectedCat("todas")}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            selectedCat === "todas"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          Todas ({totalCount})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              selectedCat === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <cat.icon className="h-3 w-3" />
            {cat.title.split(". ")[1]} ({cat.commands.length})
          </button>
        ))}
      </div>

      {/* Categorías y Comandos */}
      <div className="space-y-6">
        {categories.map((cat) => {
          if (selectedCat !== "todas" && selectedCat !== cat.id) return null;

          const filteredCmds = cat.commands.filter(
            (c) =>
              c.tag.toLowerCase().includes(search.toLowerCase()) ||
              c.description.toLowerCase().includes(search.toLowerCase())
          );

          if (filteredCmds.length === 0) return null;

          const IconComponent = cat.icon;

          return (
            <Panel key={cat.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">{cat.title}</h4>
                    <p className="text-[11px] text-muted-foreground">{cat.description}</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {filteredCmds.length} marcadores
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {filteredCmds.map((cmd) => {
                  const isCopied = copiedTag === cmd.tag;
                  return (
                    <div
                      key={cmd.tag}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-all hover:border-primary/40"
                    >
                      <div className="space-y-1 pr-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {cmd.tag}
                          </code>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              cmd.format === "Word"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : cmd.format === "Excel"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            {cmd.format}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{cmd.description}</p>
                        {cmd.example && (
                          <p className="text-[10px] text-muted-foreground/80 italic">
                            Ejemplo real: <span className="font-medium text-foreground">{cmd.example}</span>
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopy(cmd.tag)}
                        className={`flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold rounded transition-all shrink-0 ${
                          isCopied
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copiar
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
