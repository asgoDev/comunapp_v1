# ComunApp v1

Aplicación web de **gestión comunitaria** para Venezuela. Permite administrar comunidades, calles, viviendas y habitantes, con acceso segmentado por rol, auditoría de acciones y exportación de reportes en PDF.

> Este proyecto conserva la base de autenticación de una plantilla full-stack, pero el dominio actual es la gestión de comunidades y habitantes.

---

## Stack

| Capa | Tecnologías |
|---|---|
| Backend | Node.js >= 18 (ES Modules), Express 4, Mongoose 8, Zod 3, JWT, bcrypt |
| Frontend | React 18, Vite 6, Tailwind CSS 3, TanStack Query v5, Zustand 5, react-hook-form + Zod, axios |
| Base de datos | MongoDB / Mongoose |
| Auth | Access token 15 min + refresh token 8 h; cookies `httpOnly` + header `Authorization` |
| Reportes | jsPDF + jspdf-autotable |
| Paquetes | **pnpm** (obligatorio) |

---

## Roles

| Rol | Alcance |
|---|---|
| `admin` | Administración global |
| `JEFE_COMUNIDAD` | Su comunidad; lectura de habitantes; gestiona líderes de calle |
| `LIDER_CALLE` | Su comunidad + su calle; CRUD de habitantes de su calle |

La autorización se aplica en el backend. Ocultar una opción en la UI no es una medida de seguridad.

---

## Requisitos

- Node.js >= 18.
- `pnpm` instalado.
- Una base de datos MongoDB accesible (local o Atlas).

---

## Inicio rápido

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales y secretos
pnpm install
pnpm run seed     # crea el usuario admin inicial desde SEED_*
pnpm run dev      # node --watch src/server.js
```

Variables de entorno del backend (solo nombres):

`PORT`, `NODE_ENV`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `FRONTEND_URL`, `RENDER`, `SEED_NOMBRE`, `SEED_APELLIDO`, `SEED_CEDULA`, `SEED_EMAIL`, `SEED_PASSWORD`.

> No commitees `.env`. Usa `.env.example` con placeholders.
> El servidor usa `PORT || 3000`; el proxy de Vite apunta a `5000`. Unifica el puerto en tu `.env` o ajusta `frontend/vite.config.js`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# En desarrollo, VITE_API_URL puede quedar vacío y se usa el proxy de Vite
pnpm install
pnpm dev
```

Variable principal: `VITE_API_URL` (URL completa del backend, incluyendo `/api`, sin barra final). Solo es obligatoria en producción; en desarrollo se usa el proxy.

---

## Scripts

| Carpeta | Comando | Descripción |
|---|---|---|
| `backend/` | `pnpm run dev` | Servidor en modo watch |
| `backend/` | `pnpm start` | Servidor en producción |
| `backend/` | `pnpm run seed` | Crea el admin inicial |
| `backend/` | `pnpm test` | Pruebas backend con `node:test` |
| `frontend/` | `pnpm dev` | Vite en desarrollo |
| `frontend/` | `pnpm build` | Build de producción |
| `frontend/` | `pnpm test` | Pruebas de auth con `node:test` + Vite SSR |
| `frontend/` | `pnpm preview` | Previsualiza el build |

El lint y la cobertura amplia de frontend siguen pendientes (R-08). Ver [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md).

---

## Estructura

```text
backend/
├── src/
│   ├── infrastructure/     # MongoDB y JWT
│   ├── modules/            # auth, users, comunidades, habitantes, dashboard, auditoria, profile
│   ├── shared/             # errores y middlewares
│   └── server.js
├── scripts/seed.js
└── package.json

frontend/
├── src/
│   ├── components/         # layout y UI reutilizable
│   ├── hooks/              # TanStack Query por módulo
│   ├── pages/              # Login, Dashboard, Comunidades, Habitantes, Usuarios, Auditoría, Perfil
│   ├── services/           # axios por módulo
│   ├── stores/             # authStore, uiStore
│   ├── utils/              # formatters, pdfExport, venezuela.json
│   ├── validations/        # Zod por módulo
│   ├── App.jsx
│   └── main.jsx
└── package.json
```

---

## Documentación

| Documento | Contenido |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Gobernanza, reglas transversales e índice |
| [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) | Contexto global del sistema |
| [`backend_api_guide.md`](./backend_api_guide.md) | Contrato HTTP completo del backend |
| [`MEMORY.md`](./MEMORY.md) | Estado inter-sprint, decisiones y riesgos |
| [`conocimiento_back.md`](./conocimiento_back.md) | Decisiones durables del backend |
| [`conocimiento_front.md`](./conocimiento_front.md) | Decisiones durables del frontend |
| [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md) | Registro priorizado de riesgos y plan de remediación |
| [`.agents/rules/`](./.agents/rules/) | Reglas operativas de backend, frontend y documentación |
| [`documentacion/implementado_backend.md`](./documentacion/implementado_backend.md) | Historial de implementaciones backend |
| [`documentacion/implementado_frontend.md`](./documentacion/implementado_frontend.md) | Historial de implementaciones frontend |

---

## Seguridad

- Secretos solo en `.env`; nunca en código ni en documentación.
- Contraseñas con bcrypt (12 rondas) y `select: false`.
- JWT con rotación atómica del refresh, `jti` único y blacklist por hash SHA-256.
- `helmet`, CORS con credenciales, rate limiting y sanitización de Mongo activos.
- El refresh token viaja solo por cookie `HttpOnly`; el frontend mantiene el access token únicamente en memoria (R-03 resuelto).
- Revisa [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md) antes de tocar auth, scoping o formularios.

---

## Estado actual

- Módulos funcionales: autenticación, usuarios, comunidades, habitantes (incluida carga masiva y PDF), dashboard, auditoría y perfil.
- La documentación base fue consolidada el **2026-11-04**.
- Pendientes principales: CSRF, cobertura completa de pruebas/lint y paginación server-side en habitantes.

---

## Convenciones de trabajo

- Un módulo por sprint y una capa a la vez (backend o frontend).
- `pnpm` siempre.
- Mensajes, UI y commits en español.
- Cambios mínimos; consultar antes de refactors amplios o cambios de contrato.
- Propuesta de commit semántica al cerrar cada tarea.

Ver [`AGENTS.md`](./AGENTS.md) para las reglas completas.
