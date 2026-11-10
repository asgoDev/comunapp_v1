# MEMORY.md — ComunApp v1

> Memoria inter-sprint. Actualizar al cerrar cada sprint o cambio relevante.
> **Última actualización:** 2026-11-10 · Pantalla administrativa Jornadas/Bombonas integrada.

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

## Estado actual (2026-11-10)

- **Auth:** login por email/cédula, refresh con rotación atómica y `jti`, logout con blacklist, `/me`, cookies `httpOnly` + access token en body, rate limiting. El refresh solo viaja por cookie; el frontend mantiene el access en memoria (R-03 resuelto).
- **Usuarios:** CRUD con scoping para `JEFE_COMUNIDAD` (solo `LIDER_CALLE` de su comunidad), soft delete, cédula inmutable.
- **Comunidades:** CRUD admin, soft delete, resumen, validación de duplicados; lectura con scoping para `JEFE_COMUNIDAD` (R-01 resuelto).
- **Habitantes:** CRUD con scoping por comunidad/calle, unicidad de cédula por comunidad, carga masiva admin (máx. 500; 207 parcial), vistas casas/listado y export PDF.
- **Bombonas (backend):** jornadas por comunidad, una activa por comunidad, casas agrupadas por calle, precios en céntimos, registro idempotente y revisión. Comprobantes JPG/PNG a Cloudinary `authenticated`; Mongo guarda URL/metadatos, no bytes. Requiere Mongo replica set/sharded. Desde 2026-11-10 `GET /pagos` acepta filtro exacto `calle` y `GET /pagos/calles?jornadaId=` devuelve las calles de la jornada con scoping.
- **Dashboard:** métricas por rol. **Auditoría:** logs de escritura (solo admin). **Perfil:** datos propios y cambio de contraseña.
- **Frontend:** temas por variables CSS (`default`, `emerald`, `matrix`), layout responsive, TanStack Query, RHF+Zod, toasts y export PDF. Auth sin persistencia; la ruta pública Bombonas evita bootstrap de sesión, usa cliente sin Authorization, consume jornada real, agrupa calle/casa, optimiza JPG/PNG y envía con idempotencia.
- **Jornadas/Bombonas admin:** nueva ruta `/jornadas/bombonas` protegida por `RoleRoute` (`admin`, `JEFE_COMUNIDAD`). Sidebar con grupo expandible; admin elige comunidad y jefe queda fijo a la suya. Crear/cerrar jornada en modales reutilizables, tarjeta de jornada con enlace público copiable, filtros server-side estado/calle/búsqueda, tabla paginada y detalle de pago con URL firmada y revisión. Precios solo lectura.
- **Pruebas:** backend 47/47 (`pnpm test`); frontend 29/29 (`pnpm test` con Vite SSR) y `pnpm build` correcto (518 módulos). Falta probar upload con Cloudinary real y el flujo administrativo completo contra Mongo/backend; el build conserva warnings preexistentes de Browserslist/chunk.

## Decisiones vigentes

- `req.user` solo contiene `{ id, role }`; los servicios releen la BD para `comunidad`, `calle` y `estado`.
- `comunidad`, `calle` y `registradoPor` nunca se confían del body (excepto `admin` al crear habitantes con `comunidad`/`calle`).
- `User` y `Comunidad` usan soft delete; `Habitante` usa borrado físico (contrato actual).
- Cédula de usuario inmutable; cédula de habitante opcional y única por comunidad (validación de servicio).
- Listas: `{ <colección>, pagination }`; mutaciones: `{ message, <entidad> }`; errores: `{ success: false, message, code? }`.
- Auditoría global en `POST/PUT/PATCH/DELETE`; body saneado; fire-and-forget.
- Rotación de refresh con `jti` único y consumo atómico en `TokenBlacklist`; el TTL fijo de 8 h exige que `JWT_REFRESH_EXPIRES` no sea mayor.
- El refresh solo viaja por cookie `HttpOnly`; el frontend no persiste tokens. En iOS cross-site sin cookie se exige login al expirar el access token (decisión aprobada del usuario).
- R-03 backend/frontend debe desplegarse en una sola ventana; el backend cookie-only no es compatible con el frontend anterior.
- Jornadas/Bombonas admin: `admin` elige comunidad en la UI; `JEFE_COMUNIDAD` queda fijo a la suya y el payload de creación omite `comunidad` (el backend la deriva). Los precios se muestran en solo lectura; editar precios e historial quedan como deuda (R-34/R-35).
- Las rutas nuevas usan `RoleRoute`; las guardas antiguas con toast en render no se refactorizaron en este sprint (R-07/R-36).
- `backend_api_guide.md` y `README.md` fueron reescritos y sincronizados el 2026-11-04; la verdad sigue siendo el código.

## Riesgos y deudas conocidas

> Registro completo con impacto, remediación y plan por fases: [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md).

- **R-01 (P0, seguridad):** resuelto el 2026-11-04. `JEFE_COMUNIDAD` solo lista/lee su comunidad; acceso cruzado → `403`; resumen valida antes de contar.
- **R-02 (P0, seguridad):** resuelto el 2026-11-04. El refresh presentado se consume atómicamente y se rechaza su reuso/concurrencia; cada refresh lleva `jti` único.
- **R-03 (P0, seguridad):** resuelto el 2026-11-04. Refresh solo por cookie `HttpOnly`, access en memoria, `localStorage` heredado eliminado y fallback iOS validado por prueba automatizada de ausencia de cookie.
- **R-04 (P1, seguridad):** `$regex` construido con entrada del usuario en comunidades/habitantes.
- **R-05 (P1, integridad):** cédula de habitante sin índice único compuesto; riesgo de carrera.
- **R-06 (P1, seguridad):** CSRF con cookies `sameSite: 'none'` y fallback de cookie.
- **R-07 (P1, seguridad/UX):** guardas de rol duplicadas; `ProtectedRoute` solo valida autenticación.
- **R-08 (P1, calidad):** backend 44/44 y frontend 18/18; faltan lint, pruebas HTTP/integración y cobertura más amplia.
- **R-09 (P2, rendimiento):** `HabitantesPage` usa `limit=9999` y pagina en cliente.
- **R-10 (P2, contrato):** `/auth/login` devuelve `id`; `/auth/me` y los CRUD devuelven `_id`.
- **R-11 a R-20:** contrato de auditoría, límites de paginación, modelo implícito, código muerto, configuración, idempotencia, errores de campo, sanitización anidada, revocación al cambiar contraseña y duplicados de comunidad. Ver registro.
- **R-21 (documentación):** resuelto el 2026-11-04.
- **R-22 (P1, parcial):** límites por IP/comunidad, honeypot, validación y claves idempotentes ya aplicados; store es local por proceso y falta antibot/CAPTCHA adaptativo.
- **R-23 (P1):** resuelto el 2026-11-05; backend calcula el total y guarda snapshot en céntimos con pruebas.
- **R-24 (P1, parcial):** comprobantes JPG/PNG en Cloudinary `authenticated`, firma/tamaño validados y cleanup a 60 días preparado; no hay antivirus. Evaluar Cloudinary Perception Point (plan/coste) y falta smoke en cuenta real.
- **R-25 (P2, parcial):** se publican casas agrupadas por calle y datos Pago Móvil (titular, teléfono, documento); confirmar consentimiento/minimización.
- **R-26:** resuelto el 2026-11-09: `/publico/*` no espera bootstrap ni dispara chequeos de auth.
- **R-27 (P1):** confirmar MongoDB replica set/sharded para transacciones; índices críticos se crean antes de `listen`.
- **R-28 (P2, parcial):** comprobantes ya no se persisten en Mongo, pero el buffer de hasta 5 MiB vive temporalmente en RAM; evaluar streaming si aumenta concurrencia.
- **R-29:** resuelto: API pública agrupa casas por calle y exige `calle + numeroCasa`.
- **R-30 (P2, residual):** URL Cloudinary firmada puede compartirse durante 5 minutos; el plan Free consume créditos por almacenamiento/bandwidth.
- **R-31 (P2):** compensación de upload es best-effort; un fallo simultáneo de Mongo y Cloudinary puede dejar un asset huérfano que el cleanup por pagos no encontrará.
- **R-32:** resuelto el 2026-11-09: el formulario público consume la API, selecciona calle/casa, envía JPG/PNG comprimido y usa `Idempotency-Key`.
- **R-33 (P2):** cleanup 60 días preparado en dry-run, pero falta programar scheduler de despliegue; sin él no se borran automáticamente assets vencidos.
- **R-34 (P2, producto):** edición de precios de una jornada activa no soportada; la UI solo informa. Requiere endpoint, auditoría y validación de jornada activa.
- **R-35 (P2, producto):** historial de jornadas no tiene UI; el backend ya lista `activa=false`.
- **R-36 (P3, UX/seguridad):** migrar las guardas antiguas de rol a `RoleRoute`; solo `/jornadas/*` la usa por ahora.

## Próximos pasos recomendados

1. Desplegar backend+frontend de R-03 en la misma ventana; no desplegar el backend cookie-only con el frontend anterior.
2. Remediar P1: **R-04**, **R-05**, **R-06**, **R-07** y **R-08**.
3. Ampliar la suite de pruebas y añadir lint; paginación server-side (**R-09**, **R-12**).
4. Resolver P2/P3 restantes según [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md).
5. Configurar credenciales Cloudinary en backend y, cuando corresponda, scheduler para el cleanup (R-33). Antes de producción atender R-22, R-24, R-27, R-30/R-31 y confirmar consentimiento de Pago Móvil.
6. Probar manualmente el flujo Jornadas/Bombonas con backend y Mongo reales: crear jornada, copiar enlace público, registrar pago, verificar/rechazar y cerrar jornada. Abordar R-34/R-35 cuando producto lo priorice.

## Referencias

[`AGENTS.md`](./AGENTS.md) · [`.agents/rules/`](./.agents/rules/) · [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) · [`conocimiento_back.md`](./conocimiento_back.md) · [`conocimiento_front.md`](./conocimiento_front.md) · [`backend_api_guide.md`](./backend_api_guide.md) · [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md) · [`documentacion/implementado_backend.md`](./documentacion/implementado_backend.md) · [`documentacion/implementado_frontend.md`](./documentacion/implementado_frontend.md) · `documentacion/local/` (no versionado).
