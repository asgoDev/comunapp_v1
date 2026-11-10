# Guía de API — ComunApp v1

> **Contrato HTTP del backend.** La fuente de verdad es `backend/src/`; si esta guía y el código discrepan, prevalece el código y se corrige la guía.
>
> **Última actualización:** 2026-11-06.
> **Base URL:** `http://localhost:5000/api` según la convención del proxy de Vite. El servidor usa `PORT || 3000`; verifica el `.env` local. En producción, la URL la define `VITE_API_URL`.

---

## 1. Convenciones generales

- Las rutas usan JSON (`Content-Type: application/json`), excepto el registro de pago de Bombonas, que recibe `multipart/form-data`.
- Fechas en ISO 8601. `fechaNacimiento` se envía como `YYYY-MM-DD`.
- IDs MongoDB en formato hexadecimal de 24 caracteres.
- Paginación estándar: `{ total, page, limit, pages }`.
- Los listados devuelven una colección con nombre propio (`users`, `comunidades`, `habitantes`, `logs`) y `pagination`.
- Las mutaciones devuelven `{ message, <entidad> }`.
- Los errores operacionales devuelven `{ success: false, message, code? }`.
- Errores de validación Zod: `{ success: false, message: "Error de validación", errors: [{ campo, mensaje }] }`.
- Los errores de `authenticate`/`authorize` devuelven solo `{ message }` (sin `success` ni `code`).
- Rate limiting: 200 peticiones/15 min por IP en toda la API; 10 intentos/15 min en login. Al excederse: `429`.
- Bombonas público: `GET` 60/15 min por IP; `POST` 10/hora por IP y 100/hora por combinación de comunidad/IP. Los limitadores específicos usan memoria local por proceso; ver R-22 antes de escalar a varias instancias.
- `PATCH` y el header `Idempotency-Key` están permitidos por CORS.

### 1.1 Autenticación

Se acepta el access token de dos formas:

1. `Authorization: Bearer <accessToken>` (prioridad).
2. Cookie `accessToken` (fallback).

El login también establece cookies `httpOnly`:

- `accessToken`
- `refreshToken`

El refresh token **nunca** se devuelve en el JSON. La cookie es el único canal para enviarlo (R-03 resuelto).

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
  "accessToken": "eyJhbG..."
}
```

> El `refreshToken` se entrega únicamente en la cookie `HttpOnly`; no aparece en la respuesta JSON.

**Errores**

| Status | `code` | Causa |
|---|---|---|
| 400 | — | Body inválido (Zod) |
| 401 | `INVALID_CREDENTIALS` | Usuario/contraseña incorrectos |
| 403 | `ACCOUNT_DISABLED` | Cuenta inactiva |
| 429 | — | Rate limit de login |

---

### 3.2 `POST /auth/refresh`

Público. Renueva el par de tokens usando **exclusivamente** la cookie `refreshToken`. No acepta el token en el body. El token presentado se consume atómicamente antes de emitir el nuevo par; reutilizarlo o intentar dos rotaciones concurrentes responde `401 REVOKED_REFRESH_TOKEN`.

**Body:** vacío. Cualquier `refreshToken` enviado en JSON se ignora.

**Respuesta 200**

```json
{
  "message": "Token renovado exitosamente",
  "accessToken": "eyJhbG..."
}
```

> El nuevo `refreshToken` solo se entrega mediante `Set-Cookie`.

**Errores**

| Status | `code` | Causa |
|---|---|---|
| 401 | `MISSING_REFRESH_TOKEN` | No llegó la cookie `refreshToken` |
| 401 | `REVOKED_REFRESH_TOKEN` | Token en blacklist |
| 401 | `INVALID_REFRESH_TOKEN` | Token inválido o expirado |
| 401 | `USER_UNAVAILABLE` | Usuario inexistente o inactivo |

> **Rotación (R-02 resuelto):** cada refresh incluye un `jti` único y el anterior se guarda como hash SHA-256 en `TokenBlacklist` antes de emitir el nuevo par. La restricción única de `tokenHash` resuelve carreras entre peticiones concurrentes.

---

### 3.3 `POST /auth/logout`

Público. Invalida el refresh token de la cookie y limpia las cookies de sesión.

**Body:** vacío. Cualquier `refreshToken` enviado en JSON se ignora.

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

## 10. Bombonas (`/api/bombonas` y `/api/publico/bombonas`)

### 10.1 Administración de jornadas

Las rutas privadas requieren autenticación y rol `admin` o `JEFE_COMUNIDAD`. `LIDER_CALLE` no tiene acceso.
Las mutaciones privadas requieren explícitamente `Authorization: Bearer <accessToken>` para no depender del fallback de cookie en escrituras (mitigación CSRF específica del módulo).

- `admin` debe enviar la comunidad al crear la jornada.
- `JEFE_COMUNIDAD` crea y consulta únicamente la comunidad asignada en la base de datos. Si intenta indicar otra comunidad recibe `403 FORBIDDEN`.
- Solo existe una jornada activa por comunidad. Los precios y datos de pago móvil no se editan; se cierra la jornada y se crea otra.
- Los precios se reciben en VES con máximo dos decimales y se almacenan en céntimos enteros.

#### `POST /bombonas/jornadas`

**Body JSON**

```json
{
  "comunidad": "64f0c2a1b2c3d4e5f6071829",
  "precios": { "grande": 250, "mediana": 180, "pequena": 120 },
  "pagoMovil": {
    "banco": "Banesco",
    "telefono": "0414-1234567",
    "documento": "V-12345678",
    "titular": "Ana Perez"
  }
}
```

`comunidad` es requerida para `admin` y opcional para `JEFE_COMUNIDAD` (el servidor siempre deriva la asignación del usuario autenticado). Cada precio debe ser positivo, máximo 50.000.000 VES, y admitir máximo dos decimales. Los datos de pago móvil son obligatorios.

**Respuesta 201:** `{ "message": "Jornada de bombonas creada exitosamente.", "jornada": { "_id": "...", "comunidad": "...", "precios": { "grande": 250, "mediana": 180, "pequena": 120 }, "moneda": "VES", "activa": true, "pagoMovil": { "banco": "Banesco", "telefono": "0414-1234567", "documento": "V-12345678", "titular": "Ana Perez" } } }`.

#### Lectura y cierre

- `GET /bombonas/jornadas?page=1&limit=20&comunidadId=<id>&activa=true|false`: listado paginado; máximo 100 por página. Jefe siempre queda filtrado a su comunidad.
- `GET /bombonas/jornadas/:id`: detalle dentro del scope del rol.
- `PATCH /bombonas/jornadas/:id/cerrar`: body opcional `{ "motivo": "Fin de la distribución" }`; repetir cierre es idempotente. El motivo, si se envía, debe tener 5–300 caracteres.

El servidor crea los índices de jornadas/pagos antes de comenzar a escuchar. Las transacciones de alta de pagos requieren MongoDB replica set o clúster sharded; un MongoDB standalone no es compatible.

### 10.2 Consulta de jornada pública

#### `GET /publico/bombonas/comunidades/:comunidadId/jornada-activa`

No requiere autenticación. Devuelve `Cache-Control: no-store` y no expone habitantes, pagos ni identificadores internos de jornada.

```json
{
  "comunidad": { "_id": "64f0c2...", "nombre": "Comunidad Ejemplo" },
  "jornada": {
    "precios": { "grande": 250, "mediana": 180, "pequena": 120 },
    "moneda": "VES",
    "pagoMovil": {
      "banco": "Banesco",
      "telefono": "0414-1234567",
      "documento": "V-12345678",
      "titular": "Ana Perez"
    }
  },
  "viviendas": [
    { "calle": "Principal", "casas": ["1", "2", "10"] },
    { "calle": "Calle 1", "casas": ["1", "4"] }
  ],
  "limites": { "maxPorTipo": 10, "maxTotal": 20 }
}
```

`viviendas` agrupa por calle; cada lista contiene números únicos de 1–8 dígitos existentes en `Habitante`, ordenados numéricamente. Así, un mismo número puede existir en calles distintas sin ambigüedad. Comunidad inexistente/inactiva o sin jornada activa devuelve `404 JORNADA_NO_ACTIVA` con mensaje genérico.

### 10.3 Registro público de pago

#### `POST /publico/bombonas/comunidades/:comunidadId/pagos`

No requiere autenticación. Content-Type: `multipart/form-data`. Header requerido: `Idempotency-Key` con UUID v4. Enviar la misma clave y el mismo payload devuelve `200` con el resultado original; reutilizar la clave con datos diferentes devuelve `409 PAGO_IDEMPOTENCIA_CONFLICTO`.

| Campo multipart | Requerido | Reglas |
|---|---:|---|
| `calle` | Sí | Calle devuelta por `GET jornada-activa` |
| `numeroCasa` | Sí | 1–8 dígitos; debe existir en esa calle y comunidad |
| `propietario` | Sí | Nombre de 2–120 caracteres |
| `referencia` | Sí | 4–40 letras/números/guiones; se normaliza a mayúsculas |
| `bombonasGrande` | Sí | Entero de 0 a 10 |
| `bombonasMediana` | Sí | Entero de 0 a 10 |
| `bombonasPequena` | Sí | Entero de 0 a 10 |
| `website` | No | Honeypot; debe permanecer vacío |
| `comprobante` | Sí | Una imagen JPG/JPEG o PNG; máximo 5 MiB |

Se exige al menos una bombona y máximo 20 en total. No se aceptan campos extras, precios ni total del cliente. El backend valida firma binaria, MIME y extensión, confirma comunidad/calle/casa/jornada activa y calcula el total usando los precios vigentes. El SDK oficial sube la imagen con firma a Cloudinary como recurso `authenticated`; MongoDB almacena `secureUrl`, `publicId` y metadatos, pero nunca los bytes. Guarda snapshot de precios y total en céntimos. La referencia solo puede usarse una vez por jornada.

**Respuesta 201** (reintento idéntico: `200`):

```json
{
  "message": "Pago registrado exitosamente.",
  "pago": {
    "codigoSeguimiento": "PAGO-...",
    "estado": "pendiente",
    "total": 490,
    "moneda": "VES",
    "createdAt": "2026-11-05T12:00:00.000Z"
  }
}
```

El asset se organiza en Cloudinary por entorno/comunidad/jornada con `public_id` aleatorio, sin PII y con `overwrite=false`. La descarga privada valida primero el scoping y devuelve una URL `authenticated` firmada y temporal (5 minutos). La URL firmada es compartible mientras no expire. Mongo conserva el localizador, no los bytes.

La retención predeterminada es 60 días (`COMPROBANTE_RETENTION_DAYS`). El script `pnpm run bombonas:cleanup` funciona en simulación por defecto; solo `--apply` elimina assets vencidos de Cloudinary y después marca el comprobante como no disponible, conservando el registro del pago. No se ejecuta automáticamente hasta configurar un scheduler de despliegue.

La integración usa la subida firmada del SDK oficial y no usa `unsigned upload preset` ni funciones de token delivery de pago. El plan Cloudinary Free publica una cuota de 25 créditos al mes compartida entre almacenamiento, transformaciones y ancho de banda; una descarga privada puede consumir más ancho de banda que una entrega CDN estándar. Revisa la cuota en Cloudinary antes del despliegue.

> **Escaneo de malware diferido:** el backend valida formato/firma, pero no ejecuta antivirus. Cloudinary ofrece el add-on Perception Point con moderación asíncrona; no está configurado y debe confirmarse precio/disponibilidad antes de contratarlo. Hasta entonces, mantener la política de formatos y descarga privada.

### 10.4 Consulta y revisión de pagos

- `GET /bombonas/pagos?page=1&limit=20&comunidadId=<id>&jornadaId=<id>&estado=pendiente|verificado|rechazado&search=<texto>`: listado paginado; `limit` máximo 100. La búsqueda escapa regex; el jefe solo consulta su comunidad.
- `GET /bombonas/pagos/:id`: detalle sin URL de Cloudinary ni identificadores internos del asset.
- `GET /bombonas/pagos/:id/comprobante`: devuelve `{ "url": "<URL firmada>", "expiraEn": "<fecha ISO>" }` con `Cache-Control: private, no-store`; vence en 5 minutos. Solo admin global o jefe de esa comunidad. El cliente abre la URL firmada en navegación separada para evitar cargarla como XHR cross-origin.
- `PATCH /bombonas/pagos/:id/revision`: `{ "estado": "verificado" }` o `{ "estado": "rechazado", "motivoRechazo": "La referencia no coincide con el comprobante." }`. Solo pagos `pendiente`; repetir el mismo estado final es idempotente; intentar el estado opuesto responde `409 PAGO_YA_REVISADO`.

### 10.5 Límites y errores relevantes

- Límite específico: lectura pública 60/15 min por IP; registro 10/h por IP y 100/h por combinación comunidad/IP, además del limitador global de API. Respuesta `429 RATE_LIMITED`.
- Multipart limita Content-Length a 5 MiB + 32 KiB, un archivo, ocho campos y nueve partes; se valida MIME, extensión y firma JPEG/PNG. Archivo grande → `413 FILE_TOO_LARGE`; tipo/firma inválidos → `415 INVALID_FILE_TYPE` / `INVALID_FILE_SIGNATURE`.
- `400` validación / `COMUNIDAD_REQUIRED` / `IDEMPOTENCY_KEY_REQUIRED` / `INVALID_CONTENT_LENGTH` / `FILE_REQUIRED` / `CASA_NO_ENCONTRADA`.
- `401 BEARER_REQUIRED` si una mutación privada de Bombonas intenta autenticarse solo por cookie.
- `403 FORBIDDEN` acceso de jefe a comunidad/pago ajeno.
- `404 JORNADA_NO_ACTIVA`, `JORNADA_NOT_FOUND`, `PAGO_NOT_FOUND`, `COMPROBANTE_NOT_FOUND`.
- `503 CLOUDINARY_NOT_CONFIGURED`, `CLOUDINARY_UPLOAD_FAILED`, `CLOUDINARY_DOWNLOAD_FAILED`, `CLOUDINARY_DELETE_FAILED`, `PAYMENT_COMMIT_UNCONFIRMED`.
- `500 INVALID_RETENTION_CONFIG` si `COMPROBANTE_RETENTION_DAYS` está fuera de 1–3650.
- `409 JORNADA_ACTIVA_EXISTENTE`, `REFERENCIA_DUPLICADA`, `PAGO_IDEMPOTENCIA_CONFLICTO`, `PAGO_YA_REVISADO`, `PAGO_DUPLICADO`.

Las escrituras administrativas quedan auditadas; datos de Pago Móvil, motivos y texto libre sensible se redactan antes de persistirse en auditoría. Los envíos públicos guardados forman su propio registro operacional y no se escribe el archivo ni la clave de idempotencia en logs. Si Cloudinary no está configurado, las operaciones de comprobante devuelven `503` sin fallback a MongoDB ni a URLs públicas.

---

## 11. Matriz de roles

| Módulo | `admin` | `JEFE_COMUNIDAD` | `LIDER_CALLE` |
|---|---|---|---|
| Usuarios | CRUD total | CRUD de `LIDER_CALLE` de su comunidad | — |
| Comunidades | CRUD total | Lectura de su comunidad | — |
| Habitantes | CRUD + bulk | Lectura de su comunidad | CRUD de su calle |
| Dashboard | Global | Su comunidad | Su calle |
| Auditoría | Lectura | — | — |
| Perfil | Propio | Propio | Propio |
| Bombonas: jornadas/pagos | Global | Su comunidad | — |

---

## 12. Códigos de error

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
| 404 | `JORNADA_NO_ACTIVA` | Comunidad sin jornada pública disponible |
| 409 | `JORNADA_ACTIVA_EXISTENTE` | Ya hay una jornada activa en la comunidad |
| 409 | `REFERENCIA_DUPLICADA` | Referencia usada en la jornada |
| 409 | `PAGO_IDEMPOTENCIA_CONFLICTO` | UUID idempotente usado con otro payload |
| 409 | `PAGO_YA_REVISADO` | Intento de cambiar una revisión final |
| 413 | `FILE_TOO_LARGE` / `REQUEST_TOO_LARGE` | Comprobante o multipart excede el límite |
| 415 | `INVALID_FILE_TYPE` / `INVALID_FILE_SIGNATURE` | MIME, extensión o firma del archivo inválida |
| 409 | — | Duplicado Mongo (`11000`) en cédula/email de usuario |
| 400 | — | Error Zod / Mongoose ValidationError / CastError / JSON inválido |
| 429 | — | Rate limit |
| 500 | — | Error no controlado |

---

## 13. Estructura de carpetas del backend

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
│   │   ├── profile/
│   │   └── bombonas/
│   ├── shared/
│   │   ├── errors/AppError.js
│   │   └── middleware/
│   └── server.js
├── scripts/
│   ├── seed.js
│   └── cleanup-bombona-comprobantes.js
├── .env.example
└── package.json
```

---

## 14. Documentos relacionados

- [`AGENTS.md`](./AGENTS.md) — gobernanza e índice.
- [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — contexto global.
- [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md) — riesgos priorizados y plan de remediación.
- [`conocimiento_back.md`](./conocimiento_back.md) — decisiones durables del backend.
- [`documentacion/implementado_backend.md`](./documentacion/implementado_backend.md) — historial de implementaciones.
