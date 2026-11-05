# Conocimiento Backend — ComunApp v1

> **Memoria de largo plazo del backend.** No es un changelog: registra decisiones, invariantes, contratos y trampas que un agente debe conocer antes de modificar el backend. El historial de cambios vive en [`documentacion/implementado_backend.md`](./documentacion/implementado_backend.md).
>
> Última revisión: 2026-11-04.

---

## 1. Identidad técnica

- **Runtime:** Node.js >= 18, ES Modules (`"type": "module"`).
- **Framework:** Express 4.
- **ODM:** Mongoose 8.
- **Validación:** Zod 3 en la capa de ruta.
- **Auth:** JWT (`jsonwebtoken`) + bcrypt (12 rondas).
- **Seguridad HTTP:** `helmet`, `cors` con credenciales, `express-rate-limit`, `express-mongo-sanitize`, `cookie-parser`.
- **Entry point:** [`backend/src/server.js`](./backend/src/server.js).
- **Paquetes:** `pnpm` obligatorio. Los lockfiles son `pnpm-lock.yaml`.

### Flujo de una petición

```text
Route
  -> authenticate (JWT: header Authorization o cookie accessToken)
  -> authorize(...roles)
  -> validate(schema Zod)          # solo en rutas con body
  -> Controller                    # try/catch + next(error)
  -> Service (singleton)           # reglas de negocio y scoping
  -> Model (Mongoose)
  -> JSON
```

**Decisión cerrada:** no existe capa `repository` ni contenedor de inyección de dependencias. Cada servicio es un singleton exportado (`export default new XService()`). No introduzcas estas capas sin autorización explícita.

---

## 2. Módulos y responsabilidades

| Módulo | Ruta base | Responsabilidad |
|---|---|---|
| `auth` | `/api/auth` | Login, refresh, logout, `/me` |
| `users` | `/api/users` | CRUD de usuarios y scoping por rol |
| `comunidades` | `/api/comunidades` | CRUD, resumen y soft delete de comunidades |
| `habitantes` | `/api/habitantes` | CRUD, carga masiva y scoping por comunidad/calle |
| `dashboard` | `/api/dashboard` | Métricas según rol |
| `auditoria` | `/api/auditoria` | Consulta de logs (solo admin) |
| `profile` | `/api/profile` | Perfil propio y cambio de contraseña |

**Shared:** `shared/errors/AppError.js`, `shared/middleware/{auth,audit,errorHandler,security,validate}.js`.
**Infrastructure:** `infrastructure/database/db.js`, `infrastructure/jwt/jwt.utils.js`.

---

## 3. Contrato HTTP

### 3.1 Formas de respuesta

| Caso | Forma |
|---|---|
| Lista paginada de usuarios | `{ users, pagination }` |
| Lista paginada de comunidades | `{ comunidades, pagination }` |
| Lista paginada de habitantes | `{ habitantes, pagination }` |
| Lista paginada de auditoría | `{ logs, pagination }` |
| Documento individual | Objeto del recurso (sin envoltorio) |
| Creación | `201 { message, <entidad> }` |
| Actualización | `200 { message, <entidad> }` |
| Eliminación/desactivación | `200 { message, <entidad> }` |
| Carga masiva | `201` si todo OK; `207` si hubo errores parciales |
| Error operacional | `{ success: false, message, code? }` |
| Error Zod | `{ success: false, message: 'Error de validación', errors: [{ campo, mensaje }] }` |
| Error Mongoose | `{ success: false, message, errors?: [{ campo, mensaje }] }` |
| Duplicado MongoDB (`11000`) | `409 { success: false, message }` |
| Fallback 500 | `{ success: false, message }` (en producción oculta el detalle) |

`pagination` = `{ total, page, limit, pages }`.

**Decisión cerrada:** conservar estas formas. No añadir `success: true` a respuestas exitosas de forma unilateral; el frontend actual no lo espera.

### 3.2 Códigos de error relevantes

`INVALID_CREDENTIALS`, `ACCOUNT_DISABLED`, `MISSING_REFRESH_TOKEN`, `REVOKED_REFRESH_TOKEN`, `INVALID_REFRESH_TOKEN`, `USER_UNAVAILABLE`, `USER_NOT_FOUND`, `INVALID_USER_ID`, `SELF_DEACTIVATION`, `COMUNIDAD_DUPLICATE`, `INVALID_COMUNIDAD_ID`, `COMUNIDAD_NOT_FOUND`, `HABITANTE_NOT_FOUND`, `INVALID_HABITANTE_ID`, `HABITANTE_CEDULA_DUPLICATE`, `FORBIDDEN`, `VALIDATION_ERROR`, `NO_UPDATES_PROVIDED`, `INCORRECT_PASSWORD`.

Se lanzan con `new AppError(message, statusCode, code)` y los captura [`errorHandler.js`](./backend/src/shared/middleware/errorHandler.js).

---

## 4. Autenticación y sesión

### 4.1 Login

- Acepta `identifier` = email o cédula (`V-12345678` / `E-12345678`).
- Si el identificador parece cédula, normaliza a mayúsculas; si es email, a minúsculas.
- **Timing-safe:** si el usuario no existe, igual ejecuta `bcrypt.compare` contra un hash dummy para evitar enumeración por tiempo.
- Usuario `inactivo` responde `403 ACCOUNT_DISABLED` antes de validar la contraseña.
- Respuesta: `{ message, user, accessToken, refreshToken }`.
- `user` incluye `id`, `nombre`, `apellido`, `email`, `role`, `comunidad` (populada con `nombre`) y `calle`.
- Los tokens también se escriben en cookies `httpOnly` (`accessToken`, `refreshToken`) y `sessionExpiry` (legible por JS).

### 4.2 JWT y cookies

- Payload: `{ id, role }`.
- Access: `JWT_ACCESS_EXPIRES` (default `15m`).
- Refresh: `JWT_REFRESH_EXPIRES` (default `8h`).
- Cookies: `httpOnly`, `secure` en producción/Render, `sameSite: 'none'` en producción y `'lax'` en desarrollo.
- `authenticate` prioriza `Authorization: Bearer <token>` y usa la cookie `accessToken` como fallback.
- `authorize(...roles)` responde `403` si el rol no está permitido.

### 4.3 Refresh y logout

- `POST /auth/refresh` acepta el token desde cookie o body.
- Antes de verificar, consulta `TokenBlacklist` por hash SHA-256.
- Emite un nuevo par de tokens.
- **Deuda crítica:** no invalida el refresh token presentado. Un token robado sigue siendo válido hasta su expiración. La rotación con blacklist del anterior es una mejora pendiente.
- `POST /auth/logout` guarda el hash del refresh en `TokenBlacklist` y limpia cookies. Es idempotente ante fallos de invalidación (no bloquea el logout).
- `TokenBlacklist` tiene TTL de 8 h (28800 s), alineado con el refresh por defecto.

### 4.4 `/auth/me`

- Requiere autenticación.
- Proyecta solo campos públicos: `id nombre apellido email role comunidad calle`.
- `comunidad` se popula con `nombre`.

---

## 5. Autorización y scoping multi-tenant

### 5.1 Regla central

`req.user` **solo** trae `{ id, role, iat, exp }`. Nunca trae `comunidad` ni `calle` actualizadas. Por eso:

- `HabitanteService._getAuthenticatedUser(userId)` relee `role`, `comunidad`, `calle` y `estado` desde la BD.
- `UserService` relee al jefe para obtener su `comunidad`.
- `DashboardService` relee al usuario para calcular métricas.

**No confíes en el body para** `comunidad`, `calle` ni `registradoPor`. El servicio los descarta y los deriva del usuario autenticado.

### 5.2 Matriz de permisos

| Endpoint / módulo | `admin` | `JEFE_COMUNIDAD` | `LIDER_CALLE` |
|---|---|---|---|
| `GET /users` | Todos | Solo `LIDER_CALLE` de su comunidad | — |
| `POST/PUT/DELETE /users` | Todos | Solo `LIDER_CALLE` de su comunidad; fuerza rol y comunidad | — |
| `GET /comunidades` | Todas | Todas *(gap de scoping)* | — |
| `GET /comunidades/:id` y `/resumen` | Todas | Cualquiera *(gap de scoping)* | — |
| `POST/PUT/DELETE /comunidades` | Sí | No | No |
| `GET /habitantes` | Todos | Su comunidad | Su comunidad + su calle |
| `POST /habitantes` | Sí (requiere `comunidad` y `calle` en body) | No | Solo su calle (derivada) |
| `POST /habitantes/bulk` | Sí | No | No |
| `PUT/DELETE /habitantes/:id` | Todos | No (solo lectura) | Solo su calle |
| `GET /dashboard/stats` | Global | Su comunidad | Su calle |
| `GET /auditoria` | Sí | No | No |
| `GET/PUT /profile` | Propio | Propio | Propio |

### 5.3 Helpers de scoping de habitantes

- `_buildFilterByRole(authUser)`:
  - `admin` → `{}`.
  - `JEFE_COMUNIDAD` → `{ comunidad }`.
  - `LIDER_CALLE` → `{ comunidad, calle }`.
- `_assertOwnership(habitante, authUser)`:
  - `admin` pasa.
  - Verifica comunidad y, si es `LIDER_CALLE`, también calle.
  - Responde `403 FORBIDDEN` ante acceso cruzado.
- `_assertCedulaUnique(cedula, comunidad, excludeId)`:
  - `null`/`undefined` permitido.
  - Verifica duplicado por `{ cedula, comunidad }`.
  - Responde `409 HABITANTE_CEDULA_DUPLICATE`.

### 5.4 Gap conocido de comunidades

`ComunidadService.getAll`, `getById` y `getSummary` no reciben el usuario autenticado ni filtran por su comunidad. Las rutas permiten `JEFE_COMUNIDAD`. Esto permite lectura cruzada de comunidades ajenas. **Debe corregirse en el próximo sprint de comunidades**, añadiendo el scoping en el servicio y pruebas de acceso cruzado.

### 5.5 Scope de usuarios

- `JEFE_COMUNIDAD` solo puede ver/crear/editar/desactivar `LIDER_CALLE` de su propia comunidad.
- En creación/edición, el servicio **sobrescribe** `role = 'LIDER_CALLE'` y `comunidad = jefe.comunidad`.
- `deleteUser` impide desactivar la propia cuenta (`SELF_DEACTIVATION`).
- `deleteUser` es un soft delete (`estado = 'inactivo'`).

---

## 6. Modelos y decisiones de datos

### 6.1 `User`

- Roles: `admin`, `JEFE_COMUNIDAD`, `LIDER_CALLE`.
- `nombre` y `apellido`: minúsculas, trim, máx. 50.
- `cedula`: única, mayúsculas, regex `^[VE]-\d{6,9}$`; **no se puede modificar** porque `updateUserSchema` la omite.
- `email`: único, minúsculas, regex simple.
- `password`: mínimo 8, `select: false`, bcrypt 12 en `pre-save`, eliminado en `toJSON`.
- `role`: requerido; `comunidad` requerida para `JEFE_COMUNIDAD` y `LIDER_CALLE`; `calle` requerida para `LIDER_CALLE`.
- `estado`: `activo` | `inactivo`, default `activo`.
- `telefono`: regex venezolana `^(0(4(12|14|16|22|24|26)|2\d{2}))-\d{7}$`.
- Índices: `{ estado, role }`, `{ comunidad, calle }`.
- `timestamps: true`, `versionKey: false`.

### 6.2 `Comunidad`

- Campos geográficos: `nombre`, `municipio`, `estado`, `parroquia`, `ciudadPueblo`, `circuitoComuna` (opcional).
- `activo`: boolean, default `true`; **soft delete**.
- Duplicado: misma `nombre + municipio + estado` (case-insensitive) entre activas → `409 COMUNIDAD_DUPLICATE`.
- Índices: compuesto geográfico y `{ activo, nombre }`.
- `timestamps: true`, `versionKey: false`.

### 6.3 `Habitante`

- Vivienda: `numeroCasa`, `calle` (requeridos).
- Identidad: `nombres`, `apellidos` (requeridos, minúsculas); `cedula` opcional, mayúsculas, sin regex en el modelo (la valida Zod); `fechaNacimiento` opcional (sin restricción de edad).
- `jefeFamilia`: boolean requerido, default `false`.
- `discapacitado`: string opcional.
- Contacto: `telefono` (regex VE), `email` (regex simple), ambos opcionales.
- Relaciones: `comunidad` (requerida) y `registradoPor` (requerido, usuario autenticado).
- Índices: `{ comunidad, calle }`, `{ cedula }` sparse, `{ registradoPor }`.
- **Borrado físico** con `findByIdAndDelete` (no soft delete).
- **Unicidad de cédula:** solo a nivel de servicio, por comunidad. No hay índice único compuesto; existe riesgo de carrera.

### 6.4 `TokenBlacklist`

- `tokenHash`: SHA-256, único, indexado.
- `createdAt`: TTL 28800 s.
- Nunca se guarda el token en texto plano.

### 6.5 `Auditoria`

- `usuario_id` (ref User, nullable), `accion`, `modulo`, `resultado`, `statusCode`, `recurso_id`, `url`, `metodo`, `ip`, `userAgent`, `detalles` (Mixed), `fecha`.
- `accion` permitida: `CREAR | ACTUALIZAR | ELIMINAR`.
- Índices compuestos por usuario/fecha, módulo/fecha, resultado/fecha, statusCode/fecha.
- `detalles.body` guarda el body saneado; `detalles.error` guarda mensaje/código si falló.
- No hay TTL: los logs se conservan.

### 6.6 Transacciones

Los CRUD actuales afectan un solo documento. Si una operación futura escribe en varias colecciones (por ejemplo, crear habitante + actualizar contadores), debe usar una sesión/transacción de MongoDB y manejar rollback.

---

## 7. Validación y saneamiento

- `validate(schema)` reemplaza `req.body` por `result.data`; el servicio recibe datos saneados.
- Los schemas viven en `*.validation.js` por módulo.
- `emptyToNull` convierte `''` en `null` para campos opcionales/nullables.
- Cédulas se normalizan a mayúsculas; emails a minúsculas; strings con `trim`.
- `User` exige mayoría de edad (>= 18). `Habitante` no exige edad mínima.
- `update` exige al menos un campo (excepto donde el schema lo permita explícitamente).
- Carga masiva: máximo 500 habitantes; valida cada ítem con `habitanteItemSchema`; devuelve errores por fila; responde `207` si hay fallos parciales.
- `express-mongo-sanitize` está activo globalmente; no lo desactives.
- El límite de body JSON es `1mb`.

---

## 8. Auditoría

- Middleware global en [`audit.middleware.js`](./backend/src/shared/middleware/audit.middleware.js) para `POST`, `PUT`, `PATCH`, `DELETE`.
- Se ejecuta en `res.on('finish')` para capturar respuestas exitosas y errores.
- `usuario_id`: `req.user.id` o `req.auditUserId` (login).
- `modulo`: primer segmento después de `/api` en mayúsculas (ej. `USERS`, `HABITANTES`).
- `accion`: `POST -> CREAR`, `PUT/PATCH -> ACTUALIZAR`, `DELETE -> ELIMINAR`.
- `resultado`: `EXITOSO` si status 2xx; `FALLIDO` en otro caso.
- Sanea `password`, `confirmPassword`, `accessToken`, `refreshToken` en el nivel superior del body.
- Es fire-and-forget: un fallo de auditoría nunca rompe la petición.
- **Inconsistencia documental:** la guía menciona acciones `LOGIN`/`CERRAR_SESION`, pero el modelo solo admite `CREAR/ACTUALIZAR/ELIMINAR`. No inventes esos valores sin migrar el enum.

---

## 9. Seguridad operativa

- Secretos solo en `.env`; `.env` está ignorado por git en backend y frontend. No leerlos ni exponerlos.
- `.env.example` debe contener solo placeholders. Faltan por documentar `JWT_ACCESS_EXPIRES` y `JWT_REFRESH_EXPIRES` (el código los usa).
- `helmet`, `cors` con credenciales, `apiLimiter` (200 req/15 min) y `authLimiter` (10 intentos/15 min) son obligatorios.
- `app.set('trust proxy', 1)` está configurado para Render.
- CORS usa `FRONTEND_URL` o `http://localhost:5173`; si se necesitan varios orígenes, usar una allowlist explícita, no `*`.
- No expongas `password`, `refreshToken`, `accessToken` ni datos personales en logs.
- **CSRF:** con cookies `sameSite: 'none'` en producción y fallback de cookie, revisar si se necesita token CSRF o verificación de `Origin` para endpoints de escritura.
- **ReDoS/injection:** no construir `$regex` con entrada del usuario sin escapar. Casos actuales: `ComunidadService.existsByName` y `HabitanteService.getAll({ search })`.

---

## 10. Convenciones de código

- ES Modules; imports con extensión `.js`.
- Un archivo por responsabilidad: `*.model.js`, `*.service.js`, `*.controller.js`, `*.routes.js`, `*.validation.js`.
- Servicios como singleton: `class XService` + `export default new XService()`.
- Controladores delgados: solo orquestan, responden y llaman `next(error)`.
- Errores de negocio con `AppError`; nunca devolver strings sueltos desde el servicio.
- Comentarios y mensajes en español; JSDoc cuando aporte contexto.
- Respetar el estilo existente de comillas y punto y coma; el repo mezcla comillas simples y dobles según el archivo.
- Preferir `async/await` y `Promise.all` para consultas independientes.
- Evitar `mongoose.model('X')`; importar el modelo explícitamente (deuda actual en `dashboard.service.js`).
- No añadir `console.log` de depuración permanentes.

---

## 11. Comandos y entorno

```bash
# Backend
cd backend
pnpm install
pnpm run seed     # crea admin inicial desde SEED_*
pnpm run dev      # node --watch src/server.js
pnpm start        # producción

# Verificación de sintaxis
node --check src/modules/<modulo>/<archivo>.js
```

Variables de entorno usadas por el backend (solo nombres): `PORT`, `NODE_ENV`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `FRONTEND_URL`, `RENDER`, `SEED_NOMBRE`, `SEED_APELLIDO`, `SEED_CEDULA`, `SEED_EMAIL`, `SEED_PASSWORD`.

**Nota de puertos:** `server.js` usa `PORT || 3000`; la guía y el proxy de Vite apuntan a `5000`. Verifica el `.env` local y unifica la convención; el README y la guía documentan la diferencia.

---

## 12. Deudas y trampas conocidas

> Registro priorizado, impacto y plan de remediación: [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md).

1. **Scoping de comunidades incompleto** (ver §5.4). R-01.
2. **Rotación de refresh token incompleta** (ver §4.3). R-02.
3. **Tokens en `localStorage`** en el frontend; el backend también devuelve tokens en el body. R-03.
4. **Regex sin escapar** en búsquedas y validación de duplicados. R-04.
5. **Cédula de habitante sin índice único compuesto**; riesgo de duplicados concurrentes. R-05.
6. **Sin tests automatizados** ni scripts `test`/lint. R-08.
7. **`seed.js`** asigna `cargo`, campo que no existe en `User`. R-15.
8. **`dashboard.service.js`** usa `mongoose.model('Habitante')` en vez de importar el modelo. R-13.
9. **`ComunidadService.delete`** responde `404` si la comunidad ya está inactiva (no es idempotente con 409). No cambies el contrato sin aprobación. R-16.
10. **`auth.controller.login`** devuelve `refreshToken` en el body además de la cookie; necesario para iOS, pero aumenta la superficie de exposición. R-03.
11. **Saneamiento de auditoría** solo cubre el nivel superior del body; un objeto anidado con `password` no se sanea. R-18.
12. **Los listados no imponen un límite máximo** (excepto auditoría, 100). Un `limit` alto puede degradar el rendimiento. R-12.
13. **Documentación base:** `backend_api_guide.md` y `README.md` fueron reescritos y sincronizados el 2026-11-04. Resuelto (R-21).

---

## 13. Checklist para añadir/modificar un endpoint backend

- [ ] ¿Pertenece al módulo del sprint actual?
- [ ] ¿La ruta está protegida con `authenticate` y `authorize(...roles)`?
- [ ] ¿El body tiene schema Zod y `validate(schema)` en la ruta?
- [ ] ¿El servicio aplica scoping por `comunidad`/`calle` cuando el rol no es `admin`?
- [ ] ¿Se ignoran `comunidad`, `calle` y `registradoPor` del body cuando corresponde?
- [ ] ¿Se usa `AppError` con status y code consistentes?
- [ ] ¿Se mantiene la forma de respuesta existente?
- [ ] ¿Se actualizó `backend_api_guide.md` y `PROJECT_CONTEXT.md`?
- [ ] ¿Se registró en `documentacion/implementado_backend.md`?
- [ ] ¿Se verificó con `node --check` y, si aplica, smoke test?
- [ ] ¿Se identificaron riesgos de seguridad y se comunicaron?

---

## 14. Preferencias del propietario (no negociables)

- Seguridad primero; nunca atajos inseguros.
- Cero secretos hardcodeados.
- Validación Zod en backend y frontend.
- Scoping multi-tenant en servidor, no en la UI.
- Contratos estables y documentados.
- Cambios mínimos y enfocados en un módulo.
- Comentarios, mensajes y documentación en español.
- `pnpm` siempre.
- Avisar de cualquier riesgo de seguridad de inmediato.
