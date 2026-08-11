<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md — Contexto y Guía del Proyecto Zentriumph-DriveOfice

## 📌 Visión General
**Zentriumph-DriveOfice** es un sistema integral de gestión para escuelas de conducción en Ecuador (conducción tipo B, C, D, E, F y exámenes psicosensométricos). Permite administrar el ciclo de vida completo de un curso, matrículas de estudiantes, secuenciales de oficios/actas/recibos, cobros en caja y configuraciones institucionales.

---

## 🏗️ Arquitectura Técnica

- **Framework Frontend**: React 19 + TypeScript
- **Routing & SSR**: TanStack Start / TanStack Router (rutas basadas en archivos en `src/routes/`)
- **Estilos**: Tailwind CSS v4 + `tw-animate-css` + `clsx` / `tailwind-merge`
- **Componentes UI**: Componentes Radix UI + Lucide React (`lucide-react`)
- **Gestión de Estado**: Zustand (`src/lib/store.ts`) con persistencia en `localStorage` (migración planeada a Supabase)
- **Base de Datos Target**: Supabase (PostgreSQL + RLS + Client `@supabase/supabase-js`)

---

## 📂 Estructura Principal del Proyecto

```text
drive-academy-hub/
├── src/
│   ├── components/       # Componentes de UI y modales (InscripcionModal, CrearCursoModal, TopNav, etc.)
│   │   └── ui/           # Primitivos shadcn / Radix
│   ├── hooks/            # Custom hooks (uso con React / Zustand)
│   ├── lib/              # Tienda de estado (store.ts), tipos (types.ts), reporte de errores y utilidades
│   ├── routes/           # Rutas del sistema (index.tsx, cursos.index.tsx, cursos.$cursoId.tsx, caja.tsx, configuracion.tsx)
│   └── styles.css        # Estilos globales y tokens de Tailwind CSS v4
├── AGENTS.md             # Instrucciones y guía para agentes IA
├── README.md             # Documentación principal del repositorio
└── TODO.md               # Seguimiento de progreso e integración con Supabase
```

---

## 🚦 Reglas de Negocio Clave

1. **Gestión de Cursos**:
   - Cada curso tiene tipo de licencia (`B`, `C`, `D`, `E`, `F`), fechas de matrícula y curso, horarios (teoría, práctica, psicología) y límite de estudiantes por vehículo (máx. 8).
   - Avanza secuencialmente a través de **Fases (1 a 4)**.

2. **Estudiantes e Inscripciones**:
   - Campos requeridos de identificación ecuatoriana: Cédula, Nombres, Tipo de Sangre + RH automático, Cantón, Nivel de instrucción.
   - Cálculo automático de edad y saldos de pago (`valorTotal - abono`).
   - Asignación de horario práctico, vehículo e instructor.

3. **Caja y Recibos**:
   - Registro de cobros (Cursos o Exámenes Psicosensométricos).
   - Generación de secuencial automático de recibos.
   - Formas de pago: Efectivo, Transferencia, Tarjeta (con soporte para N° Comprobante).

4. **Configuración Escolar**:
   - Datos institucionales (RUC, Resolución ANT, Dirección, Representantes/Firmas).
   - Gestión CRUD de instructores (teóricos/prácticos) y vehículos.
   - Personalización visual (Modo Oscuro/Claro y 4 paletas: Azul, Verde, Naranja, Rojo).

---

## 🤖 Guía para Agentes IA
- **Modales centrados**: Todos los formularios de creación/edición deben renderizarse en modales centrados con superposición oscura semitransparente.
- **Sin Charla Aduladora**: Ir directo al punto en las respuestas.
- **Edición Eficiente**: Usar `replace_file_content` o `multi_replace_file_content` para cambios en código existente.
- **No duplicar estado**: Mantener la integridad de los tipos en `src/lib/types.ts` y las acciones en `src/lib/store.ts`.

