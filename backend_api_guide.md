# Guía de API — ComunApp v1

> **Contrato HTTP del backend.** La fuente de verdad es `backend/src/`; si esta guía y el código discrepan, prevalece el código y se corrige la guía.
>
> **Última actualización:** 2026-11-04.
> **Base URL:** `http://localhost:5000/api` según la convención del proxy de Vite. El servidor usa `PORT || 3000`; verifica el `.env` local. En producción, la URL la define `VITE_API_URL`.

---

## 1. Convenciones generales

- Todas las peticiones y respuestas usan JSON (`Content-Type: application/json`).
- Fechas en ISO 8601. `fechaNacimiento` se envía como `YYYY-MM-DD`.
- IDs MongoDB en formato hexadecimal de 24 caracteres.
- Paginación estándar: `{ total, page, limit, pages }`.
- Los listados devuelven una colección con nombre propio (`users`, `comunidades`, `habitantes`, `logs`) y `pagination`.
- Las mutaciones devuelven `{ message, <entidad> }`.
- Los errores operacionales devuelven `{ success: false, message, code? }`.
- Errores de validación Zod: `{ success: false, message: "Error de validación", errors: [{ campo, mensaje }] }`.
- Los errores de `authenticate`/`authorize` devuelven solo `{ message }` (sin `success` ni `code`).
- Rate limiting: 200 peticiones/15 min por IP en toda la API; 10 intentos/15 min en login. Al excederse: `429`.

### 1.1 Autenticación

Se acepta el access token de dos formas:

1. `Authorization: Bearer <accessToken>` (prioridad).
2. Cookie `accessToken` (fallback).

El login también establece cookies `httpOnly`:

- `accessToken`
- `refreshToken`
- `sessionExpiry` (legible por JS)

### 1.2 Roles

| Rol | Descripción |
|---|---|
| `admin` | Administrador global |
| `JEFE_COMUNIDAD` | Responsable de una comunidad; lectura de habitantes; gestiona líderes de calle |
| `LIDER_CALLE` | Responsable de una calle; CRUD de habitantes de su calle |

### 1.3 Scoping multi-tenant

- `admin`: sin restricción.
- `JEFE_COMUNIDAD`: su `comunidad`.
- `LIDER_CALLE`: su `comunidad` + su `calle`.

El scoping se aplica en el **servidor**. `comunidad`, `calle` y `registradoPor` no se confían del body para roles no admin.

`GET /comunidades`, `GET /comunidades/:id` y `GET /comunidades/:id/resumen` aplican scoping en el servidor: `JEFE_COMUNIDAD` solo accede a su propia comunidad; un acceso cruzado responde `403 FORBIDDEN`. R-01 resuelto el 2026-11-04.

---

## 2. Health

### `GET /health`

Público. Verifica que el servidor esté vivo.

**Respuesta 200**

```json
{
  "status": "ok",
  "timestamp": "2026-11-04T12:00:00.000Z",
  "uptime": 124.5
}
```

---

## 3. Autenticación (`/api/auth`)

### 3.1 `POST /auth/login`

Público. Sujeto a rate limit estricto.

**Body**

| Campo | Tipo | Requerido | Reglas |
|---|---|---|---|
| `identifier` | string | Sí | Email válido o cédula `V-12345678` / `E-12345678` |
| `password` | string | Sí | Mínimo 6 caracteres |

> La API no acepta cédula solo con números. El frontend antepone `V-` cuando el usuario escribe solo dígitos.

**Respuesta 200**

```json
{
  "message": "Inicio de sesión exitoso",
  "user": {
    "id": "64f0c2...",
    "nombre": "ana",
    "apellido": "perez",
    "email": "ana@example.com",
    "role": "LIDER_CALLE",
    "comunidad": { "_id": "64f0c2...", "nombre": "Comunidad Ejemplo" },
    "calle": "Calle 1"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Errores**

| Status | `code` | Causa |
|---|---|---|
| 400 | — | Body inválido (Zod) |
| 401 | `INVALID_CREDENTIALS` | Usuario/contraseña incorrectos |
| 403 | `ACCOUNT_DISABLED` | Cuenta inactiva |
| 429 | — | Rate limit de login |

---

### 3.2 `POST /auth/refresh`

Público. Renueva el par de tokens. Acepta el refresh token por cookie o por body.

**Body**

| Campo | Tipo | Requerido | Reglas |
|---|---|---|---|
| `refreshToken` | string | No* | Obligatorio si no llega la cookie `refreshToken` |

**Respuesta 200**

```json
{
  "message": "Token renovado exitosamente",
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Errores**

| Status | `code` | Causa |
|---|---|---|
| 401 | `MISSING_REFRESH_TOKEN` | No se envió token |
| 401 | `REVOKED_REFRESH_TOKEN` | Token en blacklist |
| 401 | `INVALID_REFRESH_TOKEN` | Token inválido o expirado |
| 401 | `USER_UNAVAILABLE` | Usuario inexistente o inactivo |

> **Riesgo conocido R-02:** el refresh actual no invalida el token presentado al rotarlo. Un refresh robado sigue válido hasta su expiración (8 h por defecto).

---

### 3.3 `POST /auth/logout`

Público. Invalida el refresh token y limpia cookies.

**Body**

| Campo | Tipo | Requerido | Reglas |
|---|---|---|---|
| `refreshToken` | string | No* | Obligatorio si no llega la cookie `refreshToken` |

**Respuesta 200**

```json
{ "message": "Sesión cerrada exitosamente" }
```

Si la invalidación falla, el logout local igual responde 200.

---

### 3.4 `GET /auth/me`

Requiere autenticación. Devuelve el perfil de la sesión.

**Respuesta 200**

```json
{
  "_id": "64f0c2...",
  "nombre": "ana",
  "apellido": "perez",
  "email": "ana@example.com",
  "role": "LIDER_CALLE",
  "comunidad": { "_id": "64f0c2...", "nombre": "Comunidad Ejemplo" },
  "calle": "Calle 1"
}
```

**Errores:** `401` si falta el token o es inválido; `404 USER_NOT_FOUND` si el usuario ya no existe.

> **Contrato:** `/auth/login` devuelve `user.id`; `/auth/me` y los CRUD devuelven `_id`. Ver riesgo R-10.

---

## 4. Usuarios (`/api/users`)

Requieren autenticación y rol `admin` o `JEFE_COMUNIDAD`.

### 4.1 Scoping

- `admin`: ve y gestiona todos.
- `JEFE_COMUNIDAD`: solo ve/gestiona `LIDER_CALLE` de su propia comunidad. El servicio fuerza `role = 'LIDER_CALLE'` y `comunidad = jefe.comunidad` en creación/edición.
- `LIDER_CALLE`: sin acceso.

### 4.2 `GET /users`

**Query params**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | 1 | Página |
| `limit` | number | 20 | Tamaño de página |
| `role` | string | — | `admin` \| `JEFE_COMUNIDAD` \| `LIDER_CALLE` (ignorado para jefe) |
| `estado` | string | — | `activo` \| `inactivo` |

**Respuesta 200**

```json
{
  "users": [
    {
      "_id": "64f0c2...",
      "nombre": "ana",
      "apellido": "perez",
      "cedula": "V-12345678",
      "fechaNacimiento": "1990-01-01T00:00:00.000Z",
      "role": "LIDER_CALLE",
      "comunidad": "64f0c2...",
      "calle": "Calle 1",
      "estado": "activo",
      "email": "ana@example.com",
      "telefono": "0412-1234567",
      "direccion": "Dirección de ejemplo",
      "createdAt": "2026-11-04T12:00:00.000Z",
      "updatedAt": "2026-11-04T12:00:00.000Z"
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
}
```

`password` nunca se devuelve.

### 4.3 `GET /users/:id`

**Respuesta 200:** documento de usuario (mismo formato que el ítem de la lista).

**Errores:** `404 USER_NOT_FOUND`; `403 FORBIDDEN` si un jefe intenta ver un usuario fuera de su alcance.

### 4.4 `POST /users`

**Body**

| Campo | Tipo | Requerido | Reglas |
|---|---|---|---|
| `nombre` | string | Sí | 1–50 caracteres |
| `apellido` | string | Sí | 1–50 caracteres |
| `cedula` | string | Sí | `V-12345678` / `E-12345678`; único; inmutable después |
| `fechaNacimiento` | string | Sí | `YYYY-MM-DD`; edad >= 18 |
| `email` | string | Sí | Email válido; único |
| `password` | string | Sí | Mínimo 8 caracteres |
| `role` | string | Sí | `admin` \| `JEFE_COMUNIDAD` \| `LIDER_CALLE` |
| `telefono` | string | No | `04XX-XXXXXXX` o `02XX-XXXXXXX` |
| `direccion` | string | No | Máximo 200 caracteres |
| `estado` | string | No | `activo` \| `inactivo` |
| `comunidad` | ObjectId | Condicional | Requerido para `JEFE_COMUNIDAD` y `LIDER_CALLE` |
| `calle` | string | Condicional | Requerido para `LIDER_CALLE` |

**Respuesta 201**

```json
{
  "message": "Usuario creado exitosamente",
  "user": { "_id": "64f0c2...", "nombre": "ana", "role": "LIDER_CALLE" }
}
```

**Errores:** `400` validación; `403 FORBIDDEN`; `409` si cédula/email ya existen.

### 4.5 `PUT /users/:id`

Todos los campos de creación son opcionales, **excepto `cedula`**, que no se puede modificar. Debe enviarse al menos un campo. Un jefe solo puede modificar líderes de su comunidad.

**Respuesta 200**

```json
{
  "message": "Usuario actualizado exitosamente",
  "user": { "_id": "64f0c2...", "estado": "activo" }
}
```

### 4.6 `DELETE /users/:id`

Soft delete: cambia `estado` a `inactivo`. No elimina el documento.

**Respuesta 200**

```json
{
  "message": "Usuario desactivado exitosamente",
  "user": { "_id": "64f0c2...", "estado": "inactivo" }
}
```

**Errores:** `400 SELF_DEACTIVATION` si intenta desactivar su propia cuenta; `403 FORBIDDEN`; `404 USER_NOT_FOUND`.

---

## 5. Comunidades (`/api/comunidades`)

Requieren autenticación. Lectura: `admin` y `JEFE_COMUNIDAD`. Escritura: solo `admin`.

### 5.1 `GET /comunidades`

**Query params**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | 1 | Página |
| `limit` | number | 20 | Tamaño de página |

**Respuesta 200**

```json
{
  "comunidades": [
    {
      "_id": "64f0c2...",
      "nombre": "Comunidad Ejemplo",
      "municipio": "Municipio Ejemplo",
      "estado": "Falcón",
      "parroquia": "Parroquia Ejemplo",
      "ciudadPueblo": "Pueblo Ejemplo",
      "circuitoComuna": null,
      "activo": true,
      "createdAt": "2026-11-04T12:00:00.000Z",
      "updatedAt": "2026-11-04T12:00:00.000Z"
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
}
```

> `estado` es la entidad geográfica; el estado lógico es `activo`.
>
> **Scoping:** `admin` ve todas las activas; `JEFE_COMUNIDAD` solo recibe su comunidad y los totales se calculan con el mismo filtro.

### 5.2 `GET /comunidades/:id`

**Respuesta 200:** documento de comunidad.

**Errores:** `400 INVALID_COMUNIDAD_ID`; `404 COMUNIDAD_NOT_FOUND` si no existe o está inactiva; `403 FORBIDDEN` si un `JEFE_COMUNIDAD` intenta leer una comunidad ajena.

### 5.3 `GET /comunidades/:id/resumen`

**Respuesta 200**

```json
{
  "comunidad": "Comunidad Ejemplo",
  "jefesComunidad": 1,
  "lideresCalle": 3,
  "habitantes": 120,
  "jefesFamilia": 45
}
```

**Errores:** `400 INVALID_COMUNIDAD_ID`; `404 COMUNIDAD_NOT_FOUND`; `403 FORBIDDEN` si la comunidad no pertenece al `JEFE_COMUNIDAD`. La propiedad se valida antes de ejecutar los conteos.

### 5.4 `POST /comunidades`

Solo `admin`.

**Body**

| Campo | Tipo | Requerido | Reglas |
|---|---|---|---|
| `nombre` | string | Sí | 1–100 caracteres |
| `municipio` | string | Sí | 1–100 caracteres |
| `estado` | string | Sí | 1–100 caracteres (entidad geográfica) |
| `parroquia` | string | Sí | 1–100 caracteres |
| `ciudadPueblo` | string | Sí | 1–100 caracteres |
| `circuitoComuna` | string | No | Máximo 100 caracteres |

**Respuesta 201**

```json
{
  "message": "Comunidad creada exitosamente.",
  "comunidad": { "_id": "64f0c2...", "nombre": "Comunidad Ejemplo", "activo": true }
}
```

**Errores:** `400` validación; `409 COMUNIDAD_DUPLICATE` si ya existe una activa con el mismo `nombre + municipio + estado` (case-insensitive).

### 5.5 `PUT /comunidades/:id`

Solo `admin`. Todos los campos son opcionales; debe enviarse al menos uno.

**Respuesta 200**

```json
{
  "message": "Comunidad actualizada exitosamente.",
  "comunidad": { "_id": "64f0c2...", "nombre": "Comunidad Actualizada" }
}
```

### 5.6 `DELETE /comunidades/:id`

Solo `admin`. Soft delete: `activo = false`.

**Respuesta 200**

```json
{
  "message": "Comunidad desactivada exitosamente.",
  "comunidad": { "_id": "64f0c2...", "activo": false }
}
```

Si ya estaba inactiva, responde `404 COMUNIDAD_NOT_FOUND` (no es idempotente con 409; ver riesgo R-16).

---

## 6. Habitantes (`/api/habitantes`)

Requieren autenticación. Lectura: los tres roles, con scoping. Creación/edición/eliminación: `admin` y `LIDER_CALLE`. `JEFE_COMUNIDAD` es solo lectura. Carga masiva: solo `admin`.

### 6.1 Scoping

- `admin`: sin restricción.
- `JEFE_COMUNIDAD`: `{ comunidad: suComunidad }`.
- `LIDER_CALLE`: `{ comunidad: suComunidad, calle: suCalle }`.
- En creación/edición, `comunidad`, `calle` y `registradoPor` se derivan del usuario autenticado. La excepción es `admin` al crear: debe enviar `comunidad` y `calle`; `registradoPor` siempre se deriva.

### 6.2 `GET /habitantes`

**Query params**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | 1 | Página |
| `limit` | number | 20 | Tamaño de página |
| `search` | string | — | Busca en `nombres`, `apellidos` y `cedula` (case-insensitive) |
| `calle` | string | — | Filtra por calle; solo `admin`/`JEFE_COMUNIDAD` |
| `comunidadId` | ObjectId | — | Filtra por comunidad; solo `admin` |

**Respuesta 200**

```json
{
  "habitantes": [
    {
      "_id": "64f0c2...",
      "numeroCasa": "12",
      "calle": "Calle 1",
      "nombres": "ana",
      "apellidos": "perez",
      "cedula": "V-12345678",
      "fechaNacimiento": "1990-01-01T00:00:00.000Z",
      "jefeFamilia": true,
      "discapacitado": null,
      "telefono": "0412-1234567",
      "email": "ana@example.com",
      "comunidad": {
        "_id": "64f0c2...",
        "nombre": "Comunidad Ejemplo",
        "estado": "Falcón",
        "municipio": "Municipio Ejemplo",
        "parroquia": "Parroquia Ejemplo",
        "ciudadPueblo": "Pueblo Ejemplo"
      },
      "registradoPor": { "_id": "64f0c2...", "nombre": "ana", "apellido": "perez" },
      "createdAt": "2026-11-04T12:00:00.000Z",
      "updatedAt": "2026-11-04T12:00:00.000Z"
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
}
```

> `search` se implementa con `$regex` sin escapar; ver riesgo R-04.

### 6.3 `GET /habitantes/:id`

**Respuesta 200:** documento del habitante. En el detalle, `comunidad` se popula solo con `nombre`; `registradoPor` con `nombre` y `apellido`.

**Errores:** `400 INVALID_HABITANTE_ID`; `404 HABITANTE_NOT_FOUND`; `403 FORBIDDEN` si está fuera de la jurisdicción.

### 6.4 `POST /habitantes`

**Body**

| Campo | Tipo | Requerido | Reglas |
|---|---|---|---|
| `numeroCasa` | string | Sí | No vacío |
| `nombres` | string | Sí | 1–100 caracteres |
| `apellidos` | string | Sí | 1–100 caracteres |
| `cedula` | string | No | `V-12345678` / `E-12345678`; única por comunidad |
| `fechaNacimiento` | string | No | `YYYY-MM-DD`; sin edad mínima |
| `jefeFamilia` | boolean | No | Default `false` |
| `discapacitado` | string | No | Texto libre |
| `telefono` | string | No | `04XX-XXXXXXX` / `02XX-XXXXXXX` |
| `email` | string | No | Email válido |
| `comunidad` | ObjectId | Solo admin | Requerido para admin; ignorado para líder |
| `calle` | string | Solo admin | Requerido para admin; ignorado para líder |

**Respuesta 201**

```json
{
  "message": "Habitante registrado exitosamente.",
  "habitante": { "_id": "64f0c2...", "nombres": "ana", "apellidos": "perez" }
}
```

**Errores:** `400 VALIDATION_ERROR`; `403 FORBIDDEN`; `409 HABITANTE_CEDULA_DUPLICATE`.

### 6.5 `POST /habitantes/bulk`

Solo `admin`.

**Body**

```json
{
  "habitantes": [
    {
      "numeroCasa": "12",
      "calle": "Calle 1",
      "nombres": "ana",
      "apellidos": "perez",
      "cedula": "V-12345678",
      "comunidad": "64f0c2..."
    }
  ]
}
```

- Máximo 500 habitantes por lote.
- Cada ítem se valida de forma independiente.
- Si un ítem falla, el lote continúa.
- Responde `201` si todos se crean; `207` si hay errores parciales.

**Respuesta 201**

```json
{
  "message": "1 habitantes cargados exitosamente.",
  "totalRecibidos": 1,
  "creadosExitosamente": 1,
  "fallidos": 0,
  "errores": []
}
```

**Respuesta 207**

```json
{
  "message": "Carga parcial: 1 creados, 1 con errores.",
  "totalRecibidos": 2,
  "creadosExitosamente": 1,
  "fallidos": 1,
  "errores": [
    {
      "fila": 2,
      "habitante": {
        "nombres": "ana",
        "apellidos": "perez",
        "cedula": "V-12345678",
        "numeroCasa": "12",
        "calle": "Calle 1"
      },
      "error": "Ya existe un habitante con la cédula \"V-12345678\" en esta comunidad."
    }
  ]
}
```

### 6.6 `PUT /habitantes/:id`

`admin` o `LIDER_CALLE` (solo su calle). Todos los campos son opcionales; debe enviarse al menos uno. `comunidad`, `calle` y `registradoPor` se descartan del body y no se modifican.

**Respuesta 200**

```json
{
  "message": "Habitante actualizado exitosamente.",
  "habitante": { "_id": "64f0c2...", "nombres": "ana" }
}
```

### 6.7 `DELETE /habitantes/:id`

`admin` o `LIDER_CALLE` (solo su calle). **Borrado físico.**

**Respuesta 200**

```json
{
  "message": "Habitante eliminado exitosamente.",
  "habitante": { "_id": "64f0c2...", "nombres": "ana", "apellidos": "perez" }
}
```

**Errores:** `400 INVALID_HABITANTE_ID`; `403 FORBIDDEN`; `404 HABITANTE_NOT_FOUND`.

---

## 7. Dashboard (`/api/dashboard`)

### `GET /dashboard/stats`

Requiere autenticación. Los nombres de los campos son genéricos, pero su significado depende del rol:

| Rol | `usersCount` | `activeUsersCount` | `auditCount` |
|---|---|---|---|
| `admin` | Total de usuarios | Usuarios activos | Eventos de auditoría |
| `JEFE_COMUNIDAD` | Líderes de calle de su comunidad | Líderes activos | Habitantes de su comunidad |
| `LIDER_CALLE` | Habitantes de su calle | Casas distintas de su calle | Jefes de familia de su calle |

**Respuesta 200**

```json
{
  "usersCount": 0,
  "activeUsersCount": 0,
  "auditCount": 0
}
```

---

## 8. Auditoría (`/api/auditoria`)

Solo `admin`.

### `GET /auditoria`

**Query params**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | 1 | Página |
| `limit` | number | 50 | Máximo 100 |
| `usuario_id` | ObjectId | — | Filtra por usuario |
| `modulo` | string | — | Ej. `AUTH`, `USERS`, `HABITANTES` |
| `accion` | string | — | `CREAR` \| `ACTUALIZAR` \| `ELIMINAR` |
| `resultado` | string | — | `EXITOSO` \| `FALLIDO` |
| `desde` | ISO date | — | Inicio del rango |
| `hasta` | ISO date | — | Fin del rango |

**Respuesta 200**

```json
{
  "logs": [
    {
      "_id": "64f0c2...",
      "usuario_id": {
        "_id": "64f0c2...",
        "nombre": "ana",
        "apellido": "perez",
        "email": "ana@example.com",
        "cedula": "V-12345678"
      },
      "accion": "CREAR",
      "modulo": "HABITANTES",
      "resultado": "EXITOSO",
      "statusCode": 201,
      "recurso_id": "64f0c2...",
      "url": "/api/habitantes",
      "metodo": "POST",
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0",
      "detalles": { "body": { "nombres": "ana" } },
      "fecha": "2026-11-04T12:00:00.000Z"
    }
  ],
  "pagination": { "total": 1, "page": 1, "limit": 50, "pages": 1 }
}
```

> **Contrato actual:** `POST /auth/login` y `POST /auth/logout` se auditan como `CREAR` porque el middleware mapea por método HTTP. El modelo no admite `LOGIN`/`CERRAR_SESION`. Ver riesgo R-11.

---

## 9. Perfil (`/api/profile`)

Requiere autenticación. Siempre opera sobre el usuario de la sesión.

### 9.1 `GET /profile`

**Respuesta 200:** documento del usuario con `comunidad` populada. `password` nunca se devuelve.

```json
{
  "_id": "64f0c2...",
  "nombre": "ana",
  "apellido": "perez",
  "cedula": "V-12345678",
  "fechaNacimiento": "1990-01-01T00:00:00.000Z",
  "role": "LIDER_CALLE",
  "comunidad": { "_id": "64f0c2...", "nombre": "Comunidad Ejemplo" },
  "calle": "Calle 1",
  "estado": "activo",
  "email": "ana@example.com",
  "telefono": "0412-1234567",
  "direccion": "Dirección de ejemplo"
}
```

### 9.2 `PUT /profile`

Campos editables: `nombre`, `apellido`, `email`, `telefono`, `direccion`, `fechaNacimiento`. `role`, `estado`, `cedula`, `comunidad` y `calle` no se pueden cambiar desde aquí. Debe enviarse al menos un campo.

**Respuesta 200**

```json
{
  "message": "Perfil actualizado exitosamente",
  "user": { "_id": "64f0c2...", "nombre": "ana" }
}
```

### 9.3 `PUT /profile/password`

**Body**

| Campo | Tipo | Requerido | Reglas |
|---|---|---|---|
| `currentPassword` | string | Sí | No vacía |
| `newPassword` | string | Sí | Mínimo 8 caracteres |
| `confirmPassword` | string | Sí | Debe coincidir con `newPassword` |

**Respuesta 200**

```json
{ "message": "Contraseña cambiada exitosamente" }
```

**Errores:** `400 INCORRECT_PASSWORD`; `400` validación.

> **Riesgo R-19:** cambiar la contraseña no revoca los refresh tokens existentes.

---

## 10. Matriz de roles

| Módulo | `admin` | `JEFE_COMUNIDAD` | `LIDER_CALLE` |
|---|---|---|---|
| Usuarios | CRUD total | CRUD de `LIDER_CALLE` de su comunidad | — |
| Comunidades | CRUD total | Lectura de su comunidad | — |
| Habitantes | CRUD + bulk | Lectura de su comunidad | CRUD de su calle |
| Dashboard | Global | Su comunidad | Su calle |
| Auditoría | Lectura | — | — |
| Perfil | Propio | Propio | Propio |

---

## 11. Códigos de error

| Status | `code` | Contexto |
|---|---|---|
| 400 | `INVALID_USER_ID` | ID de usuario inválido |
| 400 | `INVALID_COMUNIDAD_ID` | ID de comunidad inválido |
| 400 | `INVALID_HABITANTE_ID` | ID de habitante inválido |
| 400 | `VALIDATION_ERROR` | Regla de negocio/validación |
| 400 | `NO_UPDATES_PROVIDED` | Perfil sin campos válidos |
| 400 | `INCORRECT_PASSWORD` | Contraseña actual incorrecta |
| 400 | `SELF_DEACTIVATION` | Intento de desactivar la propia cuenta |
| 401 | `INVALID_CREDENTIALS` | Login fallido |
| 401 | `MISSING_REFRESH_TOKEN` | Refresh sin token |
| 401 | `REVOKED_REFRESH_TOKEN` | Refresh en blacklist |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh inválido/expirado |
| 401 | `USER_UNAVAILABLE` | Usuario inexistente/inactivo en refresh |
| 403 | `ACCOUNT_DISABLED` | Cuenta inactiva |
| 403 | `FORBIDDEN` | Sin permisos o fuera de jurisdicción |
| 404 | `USER_NOT_FOUND` | Usuario inexistente |
| 404 | `COMUNIDAD_NOT_FOUND` | Comunidad inexistente/inactiva |
| 404 | `HABITANTE_NOT_FOUND` | Habitante inexistente |
| 409 | `COMUNIDAD_DUPLICATE` | Comunidad duplicada |
| 409 | `HABITANTE_CEDULA_DUPLICATE` | Cédula duplicada en la comunidad |
| 409 | — | Duplicado Mongo (`11000`) en cédula/email de usuario |
| 400 | — | Error Zod / Mongoose ValidationError / CastError / JSON inválido |
| 429 | — | Rate limit |
| 500 | — | Error no controlado |

---

## 12. Estructura de carpetas del backend

```text
backend/
├── src/
│   ├── infrastructure/
│   │   ├── database/db.js
│   │   └── jwt/jwt.utils.js
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── comunidades/
│   │   ├── habitantes/
│   │   ├── dashboard/
│   │   ├── auditoria/
│   │   └── profile/
│   ├── shared/
│   │   ├── errors/AppError.js
│   │   └── middleware/
│   └── server.js
├── scripts/seed.js
├── .env.example
└── package.json
```

---

## 13. Documentos relacionados

- [`AGENTS.md`](./AGENTS.md) — gobernanza e índice.
- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — contexto global.
- [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md) — riesgos priorizados y plan de remediación.
- [`conocimiento_back.md`](./conocimiento_back.md) — decisiones durables del backend.
- [`documentacion/implementado_backend.md`](./documentacion/implementado_backend.md) — historial de implementaciones.
