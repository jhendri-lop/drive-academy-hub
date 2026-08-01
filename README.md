# Drive Academy Hub

# PROMPT PARA LOVABLE — FRONTEND
## Sistema de Gestión de Escuelas de Conducción (Drive Academy)

### CONTEXTO
Crear una aplicación web de escritorio (se ejecutará en Tauri/Electron) para gestionar escuelas de conducción en Ecuador. La app funciona 100% offline con base de datos SQLite local. Solo la validación de licencia va a la nube.

### TECNOLOGÍAS
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- shadcn/ui (componentes)
- React Router DOM
- Zustand (estado global)
- React Query (caché local)

### ARQUITECTURA VISUAL

#### MENÚ SUPERIOR (no lateral)
Barra de navegación horizontal en la parte superior con:
- Logo de la escuela (izquierda)
- Dashboard | Cursos | Caja | Configuración
- Toggle Modo Oscuro/Claro (derecha)
- Nombre de usuario + fecha

#### MODO OSCURO Y CLARO
Implementar tema dinámico con 4 paletas:
- Azul Profesional: #3b82f6
- Verde Moderno: #10b981  
- Naranja Cálido: #f59e0b
- Rojo Energético: #ef4444

Cada paleta debe funcionar en modo oscuro y claro. Guardar preferencia en localStorage.

#### PANTALLAS PRINCIPALES

1. **DASHBOARD**
   - 4 tarjetas resumen: Cursos Activos, Estudiantes Totales, Ingresos Hoy, Exámenes Próximos
   - Lista de cursos recientes con estado y fase actual
   - Botón flotante "+ Nuevo Curso"

2. **CURSOS (lista)**
   - Grid de tarjetas de cursos
   - Cada tarjeta: nombre, tipo licencia, fechas, alumnos, estado, fase actual
   - Botones: Fase 1, Fase 2, Fase 3, Fase 4 (los no disponibles deshabilitados)
   - Botón "Ver estudiantes →" que abre el curso

3. **DETALLE DE CURSO** (dentro del curso, NO pestaña independiente)
   - Header: nombre del curso + botón "Inscribir Alumno"
   - Tabs: Estudiantes | Documentos | Config Curso
   - Tab Estudiantes: tabla con nombre, cédula, estado, botón editar
   - Botones de acción masiva: "Generar PDF Fotos 3x4" | "Generar Recibos PDF"
   - Tab Documentos: botones para generar cada fase
   - Tab Config Curso: editar vehículos, instructores, horarios

4. **FORMULARIO INSCRIPCIÓN** (modal centrado)
   - Secciones: Datos Personales | Datos Curso (auto) | Pago | Foto
   - Campos: Nombres, Cédula, Nacionalidad (desplegable + escribir), Tipo Sangre (desplegable O+/A+/B+/AB+/O-/A-/B-/AB- → auto completa RH), Sexo, Fecha Nacimiento (input + calendario opcional), Edad (auto), Dirección, Cantón (auto desde config), Celular, Correo (auto minúsculas)
   - Curso: auto llenado (nombre, tipo licencia, fechas, horario teoría, horario práctica)
   - Horario práctica: input manual (ej: "14H00-16H00")
   - Vehículo: desplegable con vehículos del curso
   - Instructor práctico: desplegable
   - Pago: Concepto (desplegable: Curso Tipo B/C/D/E/F, Examen Psicosensométrico), Valor Total, Abono, Saldo (auto), Forma Pago (Efectivo/Transferencia/Tarjeta). Si Transferencia/Tarjeta: campo N° Comprobante + botón subir imagen
   - Foto: área de drop/upload, preview thumbnail 80x100px
   - Nivel Instrucción: desplegable (Bachiller, Superior, Básica, Primaria, Otro) + campo manual
   - Observaciones: textarea
   - Botones: "Guardar" (solo guarda) | "Guardar e Imprimir Recibo" (genera recibo PDF)
   - Después de guardar: en la tabla de estudiantes, botón "Imprimir Recibo" individual

5. **FORMULARIO CREAR CURSO** (modal centrado)
   - Nombre del curso (input)
   - Tipo Licencia (desplegable B/C/D/E/F)
   - Fechas: Inicio Matrículas, Fin Matrículas, Inicio Curso, Fin Curso (date pickers)
   - Horarios: Teoría (input manual), Práctica rango (input), Psicología y P. Auxilios (default "Sábado 08H00-12H00", editable)
   - Instructor Teórico (desplegable)
   - Vehículos: checklist con vehículos configurados (máx 8 alumnos por vehículo)
   - Número inicial de Oficio (input numérico)
   - Botón: "Crear Curso"

6. **CAJA**
   - Tarjetas: Efectivo, Transferencia, Tarjeta, Total Hoy
   - Tabla de recibos del día: N°, Estudiante, Concepto, Monto, Método, Curso
   - Botón: "Cobrar Psicosensométrico" (modal con formulario rápido: nombre, cédula, concepto, monto, método, comprobante)
   - Botón: "Cierre de Caja" (genera reporte)

7. **CONFIGURACIÓN**
   - Grid de tarjetas: Datos Escuela, Firmas, Instructores, Vehículos, Precios, Secuenciales, Logo en Documentos, Tema y Colores
   - Datos Escuela: nombre, RUC, sucursal, dirección, ciudad, teléfono, correo, resolución, logo upload
   - Firmas: Director (nombre, cargo), Secretaria (nombre, cargo), Director ANT (nombre, cargo), Representante Legal (nombre, cargo)
   - Instructores: tabla CRUD (nombre, cédula, tipo, teléfono)
   - Vehículos: tabla CRUD (número, placas, modelo)
   - Precios: inputs numéricos para cada tipo de licencia + psicosensométrico
   - Secuenciales: número inicial recibos, actas, oficios
   - Logo en Documentos: checklist por documento (recibo, oficios, fichas, actas, etc.) + opción watermark
   - Tema: toggle oscuro/claro + selector de 4 colores

8. **MODALES FLOTANTES**
   - Todos los formularios deben ser modales centrados con fondo oscuro semitransparente
   - Animación suave de entrada (fade + scale)
   - Botón X para cerrar + click fuera para cerrar
   - Scroll interno si el contenido es largo

### COMPONENTES REUTILIZABLES A CREAR
- Modal.tsx — contenedor de modal centrado
- FormSection.tsx — título de sección con línea divisoria
- InputField.tsx — input con label, validación, error
- SelectField.tsx — select con label, opciones, opción "Otro" editable
- DateField.tsx — input date + botón calendario opcional
- FileUpload.tsx — área de drop con preview
- DataTable.tsx — tabla con ordenamiento, búsqueda, paginación
- Card.tsx — tarjeta con hover effect
- StatCard.tsx — tarjeta de estadísticas con icono
- PhaseButton.tsx — botón de fase con estado (activo/inactivo/completado)
- ThemeToggle.tsx — switch oscuro/claro
- ColorPicker.tsx — selector de 4 colores

### REGLAS DE ESTADO
- Usar Zustand para estado global (cursos, estudiantes, config)
- Usar React Query para cachear consultas a SQLite
- Guardar preferencias de tema en localStorage
- Validar formularios antes de enviar (campos requeridos con *)

### RESPONSIVE
- Mínimo 1024px de ancho (app de escritorio)
- No necesita mobile
- Sidebar eliminada, todo en menú superior

### ICONOS
- Usar Lucide React para todos los iconos

### TIPOGRAFÍA
- Inter (Google Fonts) para todo el sistema
- Tamaños: 13px body, 11px labels, 16px títulos

### IMPORTANTE
- NO crear sidebar lateral
- Estudiantes SOLO dentro de cursos
- Modales SIEMPRE centrados
- Modo oscuro por defecto
- Todos los inputs deben tener estilo consistente (bordes redondeados 6px, fondo #1e293b en oscuro)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/749e00f7-38fa-4024-8c9e-56cff6b9311e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
