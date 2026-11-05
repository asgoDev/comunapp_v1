# Implementado — Frontend

> Registro cronológico de implementaciones, refactorizaciones y auditorías del frontend.
> La verdad es el código; este archivo resume la evidencia. Para decisiones durables, ver [`conocimiento_front.md`](../conocimiento_front.md).

---

## 2026-11-04 — Línea base documental (sin cambios de código)

- **Objetivo:** documentar el estado real del frontend y establecer la gobernanza del proyecto.
- **Módulos verificados:** Login, Dashboard, Comunidades, Habitantes, Usuarios, Auditoría y Perfil.
- **Archivos revisados:** `App.jsx`, `main.jsx`, `api.js`, `authStore`, `uiStore`, hooks de TanStack Query, services, validaciones, layout, componentes UI, `formatters.js`, `pdfExport.js`, `tailwind.config.js` e `index.css`.
- **Cambios:** ninguno en código de aplicación. Se crearon `AGENTS.md`, `MEMORY.md`, `PROJECT_CONTEXT.md`, `conocimiento_back.md`, `conocimiento_front.md` y las reglas en `.agents/rules/`.
- **Verificación:** `pnpm build` ejecutado en `frontend/`: **496 módulos transformados, 0 errores**. Warnings preexistentes: chunk principal de 972.50 kB y dynamic import de `authStore` (también importado estáticamente).
- **Riesgos / deudas:** tokens en `localStorage`, guardas de rol duplicadas, `limit=9999` en habitantes, errores de servidor sin mapeo a inputs, código muerto y ausencia de tests. Ver [`MEMORY.md`](../MEMORY.md).

---

## 2026-11-04 — Consolidación documental (sin cambios de código)

- **Objetivo:** cerrar la deuda documental y dejar un registro accionable de los riesgos detectados.
- **Archivos:** [`README.md`](../README.md) reescrito como documentación real de ComunApp; [`documentacion/riesgos_pendientes.md`](./riesgos_pendientes.md) creado con R-01 a R-21; [`MEMORY.md`](../MEMORY.md), [`PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`AGENTS.md`](../AGENTS.md), [`conocimiento_front.md`](../conocimiento_front.md) y [`.agents/rules/`](../.agents/rules/) sincronizados.
- **Cambios:** documentación únicamente. No se modificó código de aplicación.
- **Verificación:** `pnpm build` en `frontend/`: 496 módulos, 0 errores; warnings preexistentes (chunk 972.50 kB y dynamic import de `authStore`). Enlaces relativos de Markdown: OK.
- **Riesgos / deudas:** R-21 resuelto. El resto queda abierto en el registro, priorizado por fases.
