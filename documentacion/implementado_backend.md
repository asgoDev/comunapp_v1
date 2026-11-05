# Implementado — Backend

> Registro cronológico de implementaciones, refactorizaciones y auditorías del backend.
> La verdad es el código; este archivo resume la evidencia. Para decisiones durables, ver [`conocimiento_back.md`](../conocimiento_back.md).

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
