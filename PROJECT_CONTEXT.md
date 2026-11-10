# PROJECT_CONTEXT.md — ComunApp v1

> Contexto global y sintetizado del proyecto. Debe mantenerse al día con cada cambio relevante de backend o frontend. Para detalles operativos, consultar [`AGENTS.md`](./AGENTS.md), [`conocimiento_back.md`](./conocimiento_back.md) y [`conocimiento_front.md`](./conocimiento_front.md).
>
> Última actualización: 2026-11-09.

---

## 1. Qué es ComunApp

ComunApp es una plataforma web para la **gestión comunitaria territorial** en Venezuela. Permite registrar comunidades, calles, viviendas y habitantes, con acceso segmentado por rol, auditoría de acciones y exportación de reportes.

No es una plantilla genérica de login: aunque conserva el esqueleto de autenticación original, el dominio actual es la gestión de comunidades y habitantes.

---

## 2. Roles y modelo de acceso

| Rol | Descripción | Alcance |
|---|---|---|
| `admin` | Administrador del sistema | Global |
| `JEFE_COMUNIDAD` | Responsable de una comunidad | Su comunidad; lectura de habitantes; gestiona líderes de calle |
| `LIDER_CALLE` | Responsable de una calle | Su comunidad + su calle; CRUD de habitantes de su calle |

**Invariante:** la autorización se aplica en el backend. El frontend solo oculta o muestra opciones; no es la frontera de seguridad.

---

## 3. Arquitectura

### Backend

```text
backend/src/
├── infrastructure/
│   ├── database/db.js
│   └── jwt/jwt.utils.js
├── modules/
│   ├── auth/
│   ├── users/
│   ├── comunidades/
│   ├── habitantes/
│   ├── dashboard/
│   ├── auditoria/
│   ├── profile/
│   └── bombonas/
├── shared/
│   ├── errors/AppError.js
│   └── middleware/
│       ├── auth.middleware.js
│       ├── audit.middleware.js
│       ├── errorHandler.js
│       ├── security.middleware.js
│       └── validate.js
└── server.js
```

Flujo: `Route -> authenticate/authorize -> validate(Zod) -> Controller -> Service (singleton) -> Model -> JSON`.

**Decisiones:** sin capa repository; sin contenedor DI; servicios singleton; Mongoose directo desde el servicio.

### Frontend

```text
frontend/src/
├── components/layout/    # AppLayout, Sidebar, TopBar, ProtectedRoute
├── components/ui/        # Avatar, Button, Icon, Input, Logo, Pagination, ViewToggle
├── hooks/                # TanStack Query por módulo
├── lib/                  # queryClient
├── pages/                # Login, Dashboard, Comunidades, Habitantes, Usuarios, Auditoría, Perfil y vistas públicas
├── services/             # axios por módulo
├── stores/               # authStore, uiStore (y stubs deprecados)
├── utils/                # formatters, pdfExport, venezuela.json
├── validations/          # Zod por módulo
├── App.jsx
├── main.jsx
└── index.css
```

Flujo de datos: `Page -> hook -> service (axios) -> /api/* -> TanStack Query -> render`.

---

## 4. Modelo de datos

### `User`

- Identidad: `nombre`, `apellido`, `cedula` (única, inmutable), `fechaNacimiento`, `email` (único).
- Acceso: `password` (bcrypt, `select: false`), `role`, `estado`.
- Asignación territorial: `comunidad` (requerida para jefes/líderes), `calle` (requerida para líderes).
- Contacto: `telefono`, `direccion`.
- Soft delete vía `estado = 'inactivo'`.

### `Comunidad`

- `nombre`, `municipio`, `estado`, `parroquia`, `ciudadPueblo`, `circuitoComuna`.
- `activo` (soft delete).
- Duplicado por `nombre + municipio + estado` entre activas.

### `Habitante`

- Vivienda: `numeroCasa`, `calle`.
- Identidad: `nombres`, `apellidos`, `cedula` (opcional, única por comunidad), `fechaNacimiento`.
- Datos: `jefeFamilia`, `discapacitado`, `telefono`, `email`.
- Relaciones: `comunidad`, `registradoPor`.
- Borrado físico.

### `Auditoria`

- Registra escrituras: `usuario_id`, `accion`, `modulo`, `resultado`, `statusCode`, `recurso_id`, `url`, `metodo`, `ip`, `userAgent`, `detalles`, `fecha`.
- `accion`: `CREAR | ACTUALIZAR | ELIMINAR`.
- Consulta solo para `admin`.

### `TokenBlacklist`

- Hash SHA-256 del refresh token revocado; TTL 8 h.

---

## 5. Endpoints principales

Base: `/api`. La URL exacta depende de `VITE_API_URL` / proxy de Vite y del `PORT` del backend.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Estado del servidor |
| POST | `/auth/login` | Público + rate limit | Login por email/cédula |
| POST | `/auth/refresh` | Público | Renueva tokens |
| POST | `/auth/logout` | Público | Revoca refresh y limpia cookies |
| GET | `/auth/me` | Autenticado | Perfil de sesión |
| GET | `/users` | `admin`, `JEFE_COMUNIDAD` | Lista paginada |
| GET | `/users/:id` | `admin`, `JEFE_COMUNIDAD` | Detalle |
| POST | `/users` | `admin`, `JEFE_COMUNIDAD` | Crear |
| PUT | `/users/:id` | `admin`, `JEFE_COMUNIDAD` | Actualizar |
| DELETE | `/users/:id` | `admin`, `JEFE_COMUNIDAD` | Desactivar (soft delete) |
| GET | `/comunidades` | `admin`, `JEFE_COMUNIDAD` | Lista paginada; el jefe solo ve su comunidad |
| GET | `/comunidades/:id` | `admin`, `JEFE_COMUNIDAD` | Detalle con scoping |
| GET | `/comunidades/:id/resumen` | `admin`, `JEFE_COMUNIDAD` | Conteos con scoping |
| POST | `/comunidades` | `admin` | Crear |
| PUT | `/comunidades/:id` | `admin` | Actualizar |
| DELETE | `/comunidades/:id` | `admin` | Desactivar (soft delete) |
| GET | `/habitantes` | Los tres roles | Lista paginada con scoping |
| GET | `/habitantes/:id` | Los tres roles | Detalle con scoping |
| POST | `/habitantes` | `admin`, `LIDER_CALLE` | Crear |
| POST | `/habitantes/bulk` | `admin` | Carga masiva (máx. 500) |
| PUT | `/habitantes/:id` | `admin`, `LIDER_CALLE` | Actualizar |
| DELETE | `/habitantes/:id` | `admin`, `LIDER_CALLE` | Borrado físico |
| GET | `/dashboard/stats` | Autenticado | Métricas según rol |
| GET | `/auditoria` | `admin` | Logs paginados |
| GET | `/profile` | Autenticado | Perfil propio |
| PUT | `/profile` | Autenticado | Actualizar perfil |
| PUT | `/profile/password` | Autenticado | Cambiar contraseña |
| POST | `/bombonas/jornadas` | `admin`, `JEFE_COMUNIDAD` | Crear jornada de bombonas |
| GET | `/bombonas/jornadas` | `admin`, `JEFE_COMUNIDAD` | Listar jornadas con scoping |
| PATCH | `/bombonas/jornadas/:id/cerrar` | `admin`, `JEFE_COMUNIDAD` | Cerrar jornada |
| GET | `/bombonas/pagos` | `admin`, `JEFE_COMUNIDAD` | Consultar pagos con scoping; filtros estado/calle/búsqueda |
| GET | `/bombonas/pagos/calles` | `admin`, `JEFE_COMUNIDAD` | Calles con pagos de una jornada, con scoping |
| GET | `/bombonas/pagos/:id` | `admin`, `JEFE_COMUNIDAD` | Detalle de pago |
| GET | `/bombonas/pagos/:id/comprobante` | `admin`, `JEFE_COMUNIDAD` | URL firmada temporal del comprobante |
| PATCH | `/bombonas/pagos/:id/revision` | `admin`, `JEFE_COMUNIDAD` | Verificar o rechazar pago |
| GET | `/publico/bombonas/comunidades/:comunidadId/jornada-activa` | Público | Consultar precios, Pago Móvil y casas agrupadas por calle |
| POST | `/publico/bombonas/comunidades/:comunidadId/pagos` | Público + rate limit/idempotencia | Registrar pago y comprobante |

**Nota:** [`backend_api_guide.md`](./backend_api_guide.md) fue reescrita y sincronizada el 2026-11-04; verificar siempre contra el código si hay dudas.

---

## 6. Flujos clave

### Login

1. El usuario envía `identifier` (email/cédula) y `password`.
2. El backend valida con Zod, busca al usuario, compara con bcrypt (timing-safe) y rechaza inactivos.
3. Emite access + refresh tokens. Ambos se escriben en cookies `httpOnly`; solo el access se devuelve en el body. El refresh nunca sale en JSON.
4. El frontend mantiene el access en memoria y lo inyecta en `Authorization`; el refresh se envía exclusivamente por cookie.
5. Al renovar, el refresh presentado se consume atómicamente antes de emitir el nuevo par.

### Scoping de habitantes

1. El JWT solo trae `{ id, role }`.
2. El servicio relee al usuario desde la BD.
3. Construye el filtro: `admin` → sin restricción; `JEFE_COMUNIDAD` → su comunidad; `LIDER_CALLE` → su comunidad + calle.
4. En creación/edición, descarta `comunidad`, `calle` y `registradoPor` del body y los deriva del usuario (salvo admin al crear).

### Carga masiva

1. Solo `admin`.
2. Body: `{ habitantes: [...] }`, máximo 500.
3. Cada ítem se valida con Zod; los errores se reportan por fila.
4. Responde `201` si todos se crean; `207` si hay fallos parciales.

### Auditoría

1. Middleware global en métodos de escritura.
2. Al terminar la respuesta, registra usuario, módulo, acción, resultado, status, recurso y body saneado.
3. Es fire-and-forget: no bloquea la operación principal.

### Jornadas y pagos de bombonas

1. `admin` crea jornada para una comunidad; `JEFE_COMUNIDAD` la crea solo para su comunidad, derivada de BD.
2. Los precios se almacenan en céntimos enteros; solo se mantiene una jornada activa por comunidad.
3. La lectura pública devuelve datos de Pago Móvil y casas agrupadas por calle; el alta exige calle+número. Sin jornada activa responde `404 JORNADA_NO_ACTIVA`.
4. El alta pública exige JPG/PNG, referencia única por jornada y UUID `Idempotency-Key`; el backend valida firma/tamaño, calcula el total y sube el comprobante mediante SDK firmado a Cloudinary como `authenticated`.
5. MongoDB guarda `secureUrl`, `publicId` y metadatos, nunca bytes. El alta actualiza jornada y pago en una transacción MongoDB; requiere replica set o clúster sharded.
6. La descarga valida scoping y devuelve URL Cloudinary firmada por cinco minutos. El job a 60 días es simulación por defecto; requiere `--apply` y scheduler externo para borrar recursos.
7. En la UI administrativa (`/jornadas/bombonas`), `admin` selecciona comunidad y `JEFE_COMUNIDAD` queda fijo a la suya. La tabla solo lista pagos de la jornada activa; estado/calle/búsqueda se filtran en servidor. El detalle obtiene una URL firmada y permite verificar o rechazar con motivo. Cerrar la jornada deshabilita el formulario público y permite crear otra.

---

## 7. Frontend: rutas principales

| Ruta | Pantalla | Roles |
|---|---|---|
| `/login` | Login | Público |
| `/` | Dashboard | Todos |
| `/usuarios` | Usuarios | `admin`, `JEFE_COMUNIDAD` |
| `/usuarios/nuevo`, `/usuarios/:id` | Formulario de usuario | `admin`, `JEFE_COMUNIDAD` |
| `/comunidades` | Comunidades | `admin`, `JEFE_COMUNIDAD` |
| `/comunidades/nueva`, `/comunidades/:id` | Formulario de comunidad | `admin` |
| `/comunidades/:id/resumen` | Resumen de comunidad | `admin`, `JEFE_COMUNIDAD` |
| `/habitantes` | Habitantes | Todos |
| `/habitantes/nuevo`, `/habitantes/:id/editar` | Formulario de habitante | `admin`, `LIDER_CALLE` |
| `/habitantes/:id` | Detalle de habitante | Todos |
| `/habitantes/casa/:numero` | Detalle de casa | Todos |
| `/habitantes/carga-masiva` | Carga masiva | `admin` |
| `/auditoria` | Auditoría | `admin` |
| `/perfil` | Perfil | Todos |
| `/jornadas` | Redirige a `/jornadas/bombonas` | `admin`, `JEFE_COMUNIDAD` |
| `/jornadas/bombonas` | Jornadas y pagos de bombonas (administrativo) | `admin`, `JEFE_COMUNIDAD` |
| `/publico/pago-bombonas/:comunidadId` | Formulario público conectado a la jornada de bombonas | Público |

`ProtectedRoute` solo valida autenticación; cada página valida el rol. `RoleRoute` centraliza la guarda de `/jornadas/*` desde el 2026-11-10.

---

## 8. Entorno y operación

- Backend: `backend/.env` (no versionado) con `PORT`, `NODE_ENV`, `MONGO_URI`, secretos JWT, `FRONTEND_URL`, `SEED_*` y credenciales Cloudinary (`CLOUDINARY_*`).
- Frontend: `frontend/.env` con `VITE_API_URL` (solo producción; en desarrollo se usa el proxy de Vite).
- Proxy de Vite: `/api` → `http://localhost:5000` (el backend usa `PORT || 3000`; verificar).
- Comandos:
  - Backend: `pnpm install`, `pnpm run seed`, `pnpm run dev`, `pnpm start`.
  - Frontend: `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm preview`.
- Backend y frontend disponen de pruebas acotadas con `node:test` (`pnpm test` en cada carpeta); faltan lint y cobertura amplia.

---

## 9. Estado actual y límites

- Módulos funcionales: auth, usuarios, comunidades, habitantes (incluida carga masiva y PDF), dashboard, auditoría, perfil, Bombonas público y Jornadas/Bombonas administrativo. La ruta pública consulta el backend y envía pagos; el registro Cloudinary requiere configurar credenciales en el backend. La compresión de imágenes ocurre en el navegador; el backend sigue siendo autoritativo.
- La estética usa Tailwind con tokens CSS y tres temas.
- La vista administrativa `/jornadas/bombonas` consume el API real: jornada activa, creación/cierre, filtros server-side, detalle de pago, comprobante firmado y revisión. Edición de precios e historial de jornadas son deuda registrada (R-34/R-35).
- Hay deudas de seguridad y documentación registradas en [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md) y resumidas en [`MEMORY.md`](./MEMORY.md). Las principales: CSRF, regex sin escapar y cobertura de tests incompleta. R-01 (scoping de comunidades), R-02 (rotación de refresh) y R-03 (tokens fuera de `localStorage`) quedaron resueltos el 2026-11-04.
- `README.md` y `backend_api_guide.md` fueron reescritos y sincronizados el 2026-11-04.

---

## 10. Documentos relacionados

- [`AGENTS.md`](./AGENTS.md) — gobernanza, reglas transversales e índice.
- [`.agents/rules/regla_backend.md`](./.agents/rules/regla_backend.md) — reglas de backend.
- [`.agents/rules/regla_frontend.md`](./.agents/rules/regla_frontend.md) — reglas de frontend.
- [`.agents/rules/regla_documentacion.md`](./.agents/rules/regla_documentacion.md) — protocolo documental.
- [`MEMORY.md`](./MEMORY.md) — estado inter-sprint, riesgos y deudas.
- [`conocimiento_back.md`](./conocimiento_back.md) — decisiones durables del backend.
- [`conocimiento_front.md`](./conocimiento_front.md) — decisiones durables del frontend.
- [`backend_api_guide.md`](./backend_api_guide.md) — contratos HTTP completos.
- [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md) — registro priorizado de riesgos y plan de remediación.
- [`documentacion/implementado_backend.md`](./documentacion/implementado_backend.md) y [`documentacion/implementado_frontend.md`](./documentacion/implementado_frontend.md) — historial.
