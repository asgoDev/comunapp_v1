# MEMORY.md — ComunApp v1

> Memoria inter-sprint. Actualizar al cerrar cada sprint o cambio relevante.
> **Última actualización:** 2026-11-04 · Línea base documental (escaneo completo; sin cambios de código).

---

## Identidad

ComunApp v1: plataforma de gestión comunitaria (comunidades, calles, viviendas, habitantes) para Venezuela.
Stack: Node.js ESM + Express 4 + Mongoose 8 + Zod 3; React 18 + Vite 6 + Tailwind 3 + TanStack Query v5 + Zustand 5 + RHF/Zod. **pnpm obligatorio.**
Backend: `Route -> authenticate/authorize -> validate(Zod) -> Controller -> Service (singleton) -> Model -> JSON`. Sin capa repository ni container DI.

## Roles y alcance

| Rol | Alcance |
|---|---|
| `admin` | Global |
| `JEFE_COMUNIDAD` | Su comunidad; lectura de habitantes; gestiona `LIDER_CALLE` |
| `LIDER_CALLE` | Su comunidad + su calle; CRUD de habitantes de su calle |

## Estado actual (2026-11-04)

- **Auth:** login por email/cédula, refresh, logout con blacklist, `/me`, cookies `httpOnly` + tokens en body, rate limiting.
- **Usuarios:** CRUD con scoping para `JEFE_COMUNIDAD` (solo `LIDER_CALLE` de su comunidad), soft delete, cédula inmutable.
- **Comunidades:** CRUD admin, soft delete, resumen, validación de duplicados; lectura con scoping para `JEFE_COMUNIDAD` (R-01 resuelto).
- **Habitantes:** CRUD con scoping por comunidad/calle, unicidad de cédula por comunidad, carga masiva admin (máx. 500; 207 parcial), vistas casas/listado y export PDF.
- **Dashboard:** métricas por rol. **Auditoría:** logs de escritura (solo admin). **Perfil:** datos propios y cambio de contraseña.
- **Frontend:** temas por variables CSS (`default`, `emerald`, `matrix`), layout responsive, TanStack Query, RHF+Zod, toasts y export PDF.

## Decisiones vigentes

- `req.user` solo contiene `{ id, role }`; los servicios releen la BD para `comunidad`, `calle` y `estado`.
- `comunidad`, `calle` y `registradoPor` nunca se confían del body (excepto `admin` al crear habitantes con `comunidad`/`calle`).
- `User` y `Comunidad` usan soft delete; `Habitante` usa borrado físico (contrato actual).
- Cédula de usuario inmutable; cédula de habitante opcional y única por comunidad (validación de servicio).
- Listas: `{ <colección>, pagination }`; mutaciones: `{ message, <entidad> }`; errores: `{ success: false, message, code? }`.
- Auditoría global en `POST/PUT/PATCH/DELETE`; body saneado; fire-and-forget.
- `backend_api_guide.md` y `README.md` fueron reescritos y sincronizados el 2026-11-04; la verdad sigue siendo el código.

## Riesgos y deudas conocidas

> Registro completo con impacto, remediación y plan por fases: [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md).

- **R-01 (P0, seguridad):** resuelto el 2026-11-04. `JEFE_COMUNIDAD` solo lista/lee su comunidad; acceso cruzado → `403`; resumen valida antes de contar.
- **R-02 (P0, seguridad):** el refresh token no se invalida al rotarlo.
- **R-03 (P0, seguridad):** tokens persistidos en `localStorage` y refresh devuelto en el body.
- **R-04 (P1, seguridad):** `$regex` construido con entrada del usuario en comunidades/habitantes.
- **R-05 (P1, integridad):** cédula de habitante sin índice único compuesto; riesgo de carrera.
- **R-06 (P1, seguridad):** CSRF con cookies `sameSite: 'none'` y fallback de cookie.
- **R-07 (P1, seguridad/UX):** guardas de rol duplicadas; `ProtectedRoute` solo valida autenticación.
- **R-08 (P1, calidad):** sin tests ni scripts `test`/lint.
- **R-09 (P2, rendimiento):** `HabitantesPage` usa `limit=9999` y pagina en cliente.
- **R-10 (P2, contrato):** `/auth/login` devuelve `id`; `/auth/me` y los CRUD devuelven `_id`.
- **R-11 a R-20:** contrato de auditoría, límites de paginación, modelo implícito, código muerto, configuración, idempotencia, errores de campo, sanitización anidada, revocación al cambiar contraseña y duplicados de comunidad. Ver registro.
- **R-21 (documentación):** resuelto el 2026-11-04.

## Próximos pasos recomendados

1. Remediar P0 pendientes: **R-02** (auth backend) y **R-03** (auth backend/frontend), en sprints separados.
2. Remediar P1: **R-04**, **R-05**, **R-06**, **R-07** y **R-08**.
3. Ampliar la suite de pruebas (Vitest/RTL para frontend, lint) y añadir paginación server-side (**R-09**, **R-12**).
4. Resolver P2/P3 restantes según [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md).

## Referencias

[`AGENTS.md`](./AGENTS.md) · [`.agents/rules/`](./.agents/rules/) · [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) · [`conocimiento_back.md`](./conocimiento_back.md) · [`conocimiento_front.md`](./conocimiento_front.md) · [`backend_api_guide.md`](./backend_api_guide.md) · [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md) · [`documentacion/implementado_backend.md`](./documentacion/implementado_backend.md) · [`documentacion/implementado_frontend.md`](./documentacion/implementado_frontend.md) · `documentacion/local/` (no versionado).
