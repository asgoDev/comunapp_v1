# Implementado — Backend

> Registro cronológico de implementaciones, refactorizaciones y auditorías del backend.
> La verdad es el código; este archivo resume la evidencia. Para decisiones durables, ver [`conocimiento_back.md`](../conocimiento_back.md).

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
- **Riesgo / bloqueo:** no desplegar este backend con el frontend anterior. R-03 sigue abierto hasta completar el frontend y probar iOS.

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
