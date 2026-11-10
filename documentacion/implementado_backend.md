# Implementado — Backend

> Registro cronológico de implementaciones, refactorizaciones y auditorías del backend.
> La verdad es el código; este archivo resume la evidencia. Para decisiones durables, ver [`conocimiento_back.md`](../conocimiento_back.md).

---

## 2026-11-10 — Bombonas: filtro por calle y catálogo de calles de la jornada

- **Objetivo:** habilitar el filtro server-side por calle en la futura pantalla administrativa de Jornadas/Bombonas, sin cambiar los contratos existentes de jornadas ni de revisión.
- **Archivos:** `backend/src/modules/bombonas/bombona.validation.js`; `bombona.service.js`; `bombona.controller.js`; `bombona.routes.js`; `backend/test/bombona.service.test.js`; `backend_api_guide.md`; `conocimiento_back.md`.
- **Cambios:**
  - `GET /bombonas/pagos` acepta `calle` opcional (1–120 caracteres) y aplica coincidencia exacta después del scoping por rol.
  - Nuevo `GET /bombonas/pagos/calles?jornadaId=<id>`: valida ObjectId, carga la jornada, aplica scoping (`admin` global; jefe solo su comunidad), consulta `distinct('calle')` de los pagos de esa jornada y devuelve `{ calles }` normalizadas, deduplicadas y ordenadas con `localeCompare('es')`.
  - La ruta `/pagos/calles` se registró antes de `/pagos/:id` para evitar colisión de parámetros.
  - Se mantienen las formas de respuesta, los códigos `JORNADA_NOT_FOUND`/`FORBIDDEN` y la auditoría existente (los GET no auditan).
- **Verificación:** `node --check` en los cuatro archivos de módulo y en la prueba; `pnpm test` en `backend/` → 47/47 OK (3 pruebas nuevas: filtro exacto, calles únicas/ordenadas y rechazo de jornada ajena sin consultar pagos).
- **Riesgos / pendientes:** el filtro por calle es exacto y depende de que la UI use el catálogo devuelto por el nuevo endpoint. Siguen fuera de alcance la edición de precios y el historial de jornadas.

---

## 2026-11-05 — Módulo Bombonas: jornadas y pagos públicos

- **Objetivo:** administrar jornadas por comunidad, aceptar pagos públicos con comprobante e idempotencia, y permitir su verificación/rechazo con scoping.
- **Archivos:** `backend/src/modules/bombonas/` (modelos, validaciones, upload, service, controller y rutas); `backend/src/server.js`; `backend/src/shared/middleware/{validate,audit.middleware,security.middleware,errorHandler}.js`; `backend/test/bombona.*.test.js`; `backend/package.json`; `backend/pnpm-lock.yaml`.
- **Cambios:**
  - Rutas privadas para jornadas y revisión de pagos; públicas para consulta de jornada/casas y alta multipart de pagos.
  - Roles `admin` global y `JEFE_COMUNIDAD` restringido a su comunidad; líderes sin acceso.
  - Precios y totales almacenados en céntimos; validación de casa, referencias únicas, jornadas activas e idempotencia UUID v4 basada en hashes.
  - Alta de pago y actualización atómica de jornada dentro de una transacción MongoDB. Índices únicos se crean al arrancar el servidor.
  - Comprobante único JPG/PNG/PDF de hasta 5 MiB, con MIME/extensión y firma binaria validados; descarga privada como attachment.
  - Limitadores específicos públicos, honeypot, CORS para `PATCH`/`Idempotency-Key`, búsqueda escapada y redacción de PII en auditoría/logs.
  - Las escrituras privadas de Bombonas exigen `Authorization: Bearer` como mitigación CSRF para este módulo.
- **Verificación:** `backend/pnpm test` → 38/38 OK; `node --check` para todos los archivos tocados; `git diff --check` OK. No se ejecutó smoke HTTP porque requiere base Mongo configurada; no se leyó `.env`.
- **Riesgos / operación en esa entrega:** R-23 resuelto; R-22/R-24/R-25 parcialmente mitigados; R-26 frontend sigue abierto; R-27/R-28/R-29 abiertos. La entrada siguiente registra la evolución de almacenamiento y resuelve R-29.

---

## 2026-11-06 — Bombonas: almacenamiento privado en Cloudinary y viviendas por calle

- **Objetivo:** sacar los bytes de comprobantes de MongoDB, preservar descarga privada y eliminar la ambigüedad de números de casa repetidos entre calles.
- **Archivos:** `backend/src/modules/bombonas/`; `backend/scripts/cleanup-bombona-comprobantes.js`; `backend/.env.example`; `backend/package.json`; `backend/test/bombona.*.test.js`; `backend/test/bombona.cloudinary.test.js`; `backend_api_guide.md`; `PROJECT_CONTEXT.md`; `conocimiento_back.md`; `README.md`; `MEMORY.md`; `documentacion/riesgos_pendientes.md`.
- **Cambios:**
  - SDK oficial Cloudinary con subida firmada, recurso `authenticated`, `backup=false`, `noindex`, IDs aleatorios segmentados por entorno/comunidad/jornada y sin nombres de archivo.
  - MongoDB guarda `secureUrl`, `publicId`, `assetId`, formato/tamaño/hash y vencimiento; no hay campo binario. Reintentos idempotentes evitan otra subida; abortos Mongo disparan borrado compensatorio best-effort.
  - La descarga autorizada devuelve JSON con URL firmada de cinco minutos, `no-store` y sin incluir URL/publicId en listados.
  - Solo JPG/JPEG/PNG son aceptados. El backend valida extensión, MIME, firma y tamaño; la compresión queda para el sprint frontend independiente.
  - La jornada devuelve casas agrupadas por calle; el alta exige calle+número y valida la combinación dentro de la comunidad.
  - Limpieza de vencidos a 60 días, simulación por defecto y `--apply` explícito; conserva el pago y marca el comprobante eliminado.
- **Verificación:** `backend/pnpm test` → 44/44 OK; `node --check` en `backend/src`, scripts y pruebas; pendiente smoke HTTP y subida real porque las credenciales Cloudinary aún no se han configurado.
- **Riesgos / operación:** R-29 resuelto; R-24/R-28 parcialmente mitigados. Sin antimalware, scheduler ni store de rate limit compartido; enlace firmado compartible 5 min; compensación Cloudinary es best-effort y puede dejar huérfano si fallan ambos servicios. Configurar `.env` de backend sin compartirlo.
- **Pendiente de integración:** no se modificó frontend; su vista mock todavía no envía calle ni Idempotency-Key y valida PDF. Ver R-32 para el sprint frontend posterior.

---

## 2026-11-04 — R-03 backend: contrato cookie-only

- **Objetivo:** eliminar el refresh token de las respuestas JSON y del canal body; dejar la cookie `HttpOnly` como único transporte.
- **Archivos:** `auth.controller.js`, `jwt.utils.js`, `backend/test/auth.controller.test.js`.
- **Cambios:**
  - Login devuelve `{ message, user, accessToken }`; el refresh solo se escribe en cookie.
  - Refresh y logout leen exclusivamente `req.cookies.refreshToken`; ignoran el body.
  - Se elimina la cookie legible `sessionExpiry`.
  - Se mantiene `SameSite=None; Secure` en producción por despliegue cross-site y fallback de iOS.
- **Verificación:** `node --check`; `pnpm test` → 21/21 pruebas OK (5 nuevas de contrato).
- **Riesgo / bloqueo:** no desplegar este backend con el frontend anterior. El frontend se completó el mismo día; el despliegue debe seguir siendo coordinado.

---

## 2026-11-04 — R-02: rotación atómica del refresh token

- **Objetivo:** invalidar el refresh presentado al rotarlo y detectar reuso o concurrencia.
- **Archivos:** `auth.service.js`, `jwt.utils.js`, `backend/test/auth.service.test.js`.
- **Cambios:**
  - Cada refresh se firma con un `jti` aleatorio.
  - El hash SHA-256 del token presentado se inserta en `TokenBlacklist` antes de emitir el nuevo par.
  - La restricción única de `tokenHash` convierte el consumo en una operación atómica; un duplicado responde `401 REVOKED_REFRESH_TOKEN`.
  - Logout conserva su comportamiento idempotente.
- **Verificación:** `node --check`; `pnpm test` → 16/16 pruebas OK (6 nuevas de auth).
- **Riesgo operativo documentado:** el TTL fijo de la blacklist es 8 h; no configurar un refresh más longevo sin ajustar el índice.
- **Riesgos:** R-02 resuelto. R-03 sigue abierto.

---

## 2026-11-04 — R-01: scoping de Comunidades

- **Objetivo:** impedir que `JEFE_COMUNIDAD` liste, lea o consulte conteos de comunidades ajenas.
- **Archivos:** `comunidad.service.js`, `comunidad.controller.js`, `backend/test/comunidad.service.test.js`, `backend/package.json`.
- **Cambios:**
  - El servicio relee `role`, `comunidad` y `estado` desde la BD.
  - `getAll` aplica el mismo filtro a `find` y `countDocuments`.
  - `getById` y `getSummary` responden `403 FORBIDDEN` ante acceso cruzado; el resumen valida propiedad antes de contar.
  - Jefe sin comunidad → `403`; usuario inactivo → `401 USER_NOT_FOUND`.
- **Verificación:** `node --check` en servicio y controlador; `pnpm test` → 10/10 pruebas OK.
- **Riesgos:** R-01 resuelto. R-02 y R-03 siguen abiertos.

---

## 2026-11-04 — Línea base documental (sin cambios de código)

- **Objetivo:** documentar el estado real del backend y establecer la gobernanza del proyecto.
- **Módulos verificados:** `auth`, `users`, `comunidades`, `habitantes`, `dashboard`, `auditoria`, `profile`.
- **Archivos revisados:** rutas, controladores, servicios, modelos, validaciones, middlewares compartidos, `server.js`, `jwt.utils.js` y `seed.js`.
- **Cambios:** ninguno en código de aplicación. Se crearon `AGENTS.md`, `MEMORY.md`, `PROJECT_CONTEXT.md`, `conocimiento_back.md`, `conocimiento_front.md` y las reglas en `.agents/rules/`.
- **Verificación:** `node --check` ejecutado sobre 41 archivos JS de `backend/src` y `backend/scripts`: **41/41 OK**. No se ejecutó el servidor ni smoke test HTTP.
- **Riesgos / deudas:** scoping incompleto de comunidades, rotación de refresh token, regex sin escapar, unicidad de cédula sin índice compuesto, ausencia de tests y guía de API desactualizada (resuelta en la entrada siguiente). Ver [`MEMORY.md`](../MEMORY.md).

---

## 2026-11-04 — Consolidación documental (sin cambios de código)

- **Objetivo:** cerrar la deuda documental y dejar un registro accionable de los riesgos detectados.
- **Archivos:** [`backend_api_guide.md`](../backend_api_guide.md) reescrito con todos los módulos y contratos reales; [`documentacion/riesgos_pendientes.md`](./riesgos_pendientes.md) creado con R-01 a R-21; [`MEMORY.md`](../MEMORY.md), [`PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`AGENTS.md`](../AGENTS.md), [`conocimiento_back.md`](../conocimiento_back.md) y [`.agents/rules/`](../.agents/rules/) sincronizados.
- **Cambios:** documentación únicamente. No se modificó código de aplicación.
- **Verificación:** `node --check` sobre 41/41 archivos JS del backend: OK. Enlaces relativos de Markdown: OK.
- **Riesgos / deudas:** R-21 resuelto. El resto queda abierto en el registro, priorizado por fases.
