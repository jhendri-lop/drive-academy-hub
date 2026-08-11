# 🚗 Zentriumph-DriveOfice

> **Sistema de Gestión Integral para Escuelas de Conducción en Ecuador**

Zentriumph-DriveOfice es una aplicación web moderna diseñada para la administración completa de escuelas de conducción. Permite controlar cursos de capacitación vial (Licencias Tipo B, C, D, E, F), matrículas de estudiantes, flujo por fases, control de caja y recibos, gestión de flota vehicular e instructores, y configuración institucional adaptada a las normativas de la **ANT (Agencia Nacional de Tránsito de Ecuador)**.

---

## ✨ Características Principales

### 📊 1. Dashboard Principal
- Tarjetas resumen con métricas clave: Cursos Activos, Estudiantes Totales, Ingresos Hoy, Exámenes Próximos.
- Listado dinámico de cursos en progreso con su estado y fase actual (Fases 1 a 4).
- Acceso directo para la creación de nuevos cursos e inscripción de alumnos.

### 📚 2. Gestión de Cursos & Fases
- Vista en cuadrícula (grid) de todos los cursos disponibles.
- Control de fases operativas (**Fase 1**, **Fase 2**, **Fase 3**, **Fase 4**).
- Detalle del curso con pestañas para:
  - **Estudiantes**: Lista completa de matriculados, cédula, estado y recibos.
  - **Documentos**: Generación de fichas, actas y reportes.
  - **Configuración del Curso**: Asignación de vehículos, instructores y horarios.

### 📝 3. Formularios Inteligentes & Inscripción
- Formulario de inscripción en modal centrado.
- Autocompletado de tipo de sangre y factor RH.
- Cálculo automático de edad y saldos (`Valor Total` - `Abono` = `Saldo`).
- Gestión de fotos de perfil (drop area & preview).
- Registro flexible de formas de pago: Efectivo, Transferencia o Tarjeta con N° de comprobante.

### 💰 4. Módulo de Caja & Recibos
- Métricas financieras diarias: Total Efectivo, Transferencias, Tarjetas y Total del Día.
- Tabla detallada de recibos emitidos con numeración secuencial automática.
- Modal de cobro rápido para **Exámenes Psicosensométricos**.
- Cierre de caja e informes de recaudación.

### ⚙️ 5. Configuración Institucional & Temas
- **Datos de la Escuela**: RUC, Sucursal, Dirección, Teléfono, Correo y Resolución ANT.
- **Firmas Autorizadas**: Director General, Secretaria, Director ANT y Representante Legal.
- **CRUD de Flota & Personal**: Administración de vehículos (placas, modelo) e instructores (teóricos/prácticos).
- **Personalización Visual**: Selector de Tema (Oscuro/Claro) y 4 Paletas de Colores (Azul Profesional, Verde Moderno, Naranja Cálido, Rojo Energético).

---

## 🛠️ Tecnologías Utilizadas

- **Core**: React 19, TypeScript
- **Enrutamiento & SSR**: TanStack Start / TanStack Router
- **Estilos**: Tailwind CSS v4, Lucide React Icons
- **Estado Global**: Zustand (con persistencia en `localStorage`)
- **Base de Datos Próxima**: Supabase (PostgreSQL + RLS)

---

## 🚀 Inicio Rápido en Desarrollo Local

### Requisitos Previos
- Node.js (v18 o superior)
- npm o bun

### Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd drive-academy-hub

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000` (o el puerto indicado por Vite/TanStack Start).

### Comandos Disponibles

```bash
npm run dev        # Inicia el servidor de desarrollo
npm run build      # Compila la aplicación para producción
npm run preview    # Previsualiza la compilación de producción
npm run lint       # Ejecuta el linter (ESLint)
npm run format     # Formatea el código con Prettier
```

---

## 📌 Hoja de Ruta (Roadmap)

Consulta el archivo [TODO.md](file:///c:/Users/THUNDEROBOT/Zentriumph-driveofice/drive-academy-hub/TODO.md) para revisar el progreso del desarrollo y los pasos detallados para la **integración con la base de datos de Supabase**.

