# Registro de Riesgos Pendientes — ComunApp v1

> **Backlog de remediación.** Cada riesgo detectado en el escaneo del 2026-11-04 tiene un ID estable, prioridad, ubicación, impacto y remediación propuesta. Al resolverlo, actualizar su estado y registrar la evidencia en [`documentacion/implementado_backend.md`](./implementado_backend.md) o [`documentacion/implementado_frontend.md`](./implementado_frontend.md).
>
> **Estado:** 2026-11-05 · R-01, R-02, R-03, R-21 y R-23 resueltos; R-22, R-24 y R-25 parcialmente mitigados; otros abiertos.

## Escala

| Prioridad | Significado |
|---|---|
| **P0** | Crítico: exposición de datos o sesión; resolver antes de nuevas funcionalidades |
| **P1** | Alto: seguridad, integridad o calidad con impacto directo |
| **P2** | Medio: rendimiento, contrato o mantenibilidad relevante |
| **P3** | Bajo: limpieza, UX o deuda menor |

---

## Registro

| ID | Prioridad | Área | Riesgo y ubicación | Impacto | Remediación propuesta | Estado |
|---|---|---|---|---|---|---|
| **R-01** | P0 | Seguridad / scoping | `GET /comunidades`, `GET /comunidades/:id` y `/:id/resumen` no filtraban por la comunidad del `JEFE_COMUNIDAD` (`comunidad.service.js`, `comunidad.controller.js`). | Un jefe podía leer comunidades y conteos ajenos (exposición cruzada). | Servicio recibe el usuario autenticado, relee la BD, filtra `find` y `countDocuments`, responde `403` en acceso cruzado y valida antes de contar. | **Resuelto** (2026-11-04; 10 pruebas en `backend/test/comunidad.service.test.js`) |
| **R-02** | P0 | Seguridad / auth | `auth.service.refresh` emitía tokens nuevos sin invalidar el refresh presentado. | Un refresh robado seguía válido hasta 8 h; no había detección de reuso. | Hash del refresh en `TokenBlacklist` antes de emitir, índice único como consumo atómico, `jti` único por refresh y pruebas de reuso/concurrencia. | **Resuelto** (2026-11-04; 6 pruebas en `backend/test/auth.service.test.js`) |
| **R-03** | P0 | Seguridad / frontend | `authStore` persistía `accessToken` y `refreshToken` en `localStorage`; el login devolvía el refresh en el body. | Robo de sesión por XSS; exposición del refresh a JS. | Backend cookie-only, access token en memoria, limpieza de `auth-storage`, bootstrap con fallback iOS y pruebas de store/interceptor. | **Resuelto** (2026-11-04; 5 pruebas backend + 9 frontend) |
| **R-04** | P1 | Seguridad / backend | `ComunidadService.existsByName` y `HabitanteService.getAll({ search })` construyen `$regex` con entrada del usuario. | ReDoS, falsos matches y comportamiento inesperado. | Escapar caracteres regex (`escapeRegex`) o usar búsqueda normalizada/`$text`; limitar longitud; tests con caracteres especiales. | Abierto |
| **R-05** | P1 | Integridad / habitantes | La unicidad de cédula de habitante se valida solo en servicio; no hay índice único compuesto `{ comunidad, cedula }`. | Duplicados por condiciones de carrera. | Crear índice único parcial (`partialFilterExpression` para cédula string); manejar `11000`; test de concurrencia. | Abierto |
| **R-06** | P1 | Seguridad / auth | Cookies `sameSite: 'none'` en producción y fallback de cookie para escrituras; no hay CSRF token ni validación de `Origin`. | Posible CSRF en endpoints de escritura si se autentica por cookie. | Añadir CSRF token/double-submit o validar `Origin`/`Referer`; documentar el flujo; tests. | Abierto |
| **R-07** | P1 | Seguridad / UX | `ProtectedRoute` solo valida autenticación; cada página duplica guardas de rol (algunas con `toast.error` en render). | Una ruta nueva puede quedar sin protección; efectos secundarios en render. | Crear `RoleRoute`/configuración central de rutas por rol; tests de acceso por rol. | Abierto |
| **R-08** | P1 | Calidad | No hay tests ni scripts `test`/lint en backend ni frontend. | Regresiones en auth, scoping, validaciones y formatters. | Añadir Vitest + supertest (backend) y Vitest + RTL (frontend); scripts `test`; documentar cobertura mínima. | Abierto |
| **R-09** | P2 | Rendimiento | `HabitantesPage` solicita `limit=9999` y pagina/agrupa en cliente. | Latencia, memoria y respuestas grandes con muchas comunidades. | Paginación server-side; endpoint de exportación por tramos o streaming. | Abierto |
| **R-10** | P2 | Contrato / API | `/auth/login` devuelve `user.id`; `/auth/me` y los CRUD devuelven `_id`. | Errores sutiles en el frontend al comparar/usar identificadores. | Estandarizar en `_id` o exponer `id` en todas las respuestas; actualizar frontend y guía. | Abierto |
| **R-11** | P2 | Auditoría | `POST /auth/login` y `POST /auth/logout` se registran como `CREAR`; el modelo solo admite `CREAR/ACTUALIZAR/ELIMINAR`. | Logs engañosos; la guía y el modelo no coinciden. | Añadir `LOGIN`/`CERRAR_SESION` al enum y mapear rutas, o documentar el comportamiento actual; tests. | Abierto |
| **R-12** | P2 | Rendimiento / DoS | Los listados no imponen un `limit` máximo (salvo auditoría, 100). | Respuestas muy grandes y posible agotamiento de recursos. | Cap de `limit` (ej. 100) en controladores/servicios; documentar; tests. | Abierto |
| **R-13** | P2 | Mantenibilidad | `dashboard.service.js` usa `mongoose.model('Habitante')` en vez de importar el modelo. | Falla si cambia el orden de registro/importación de modelos. | Importar `Habitante` explícitamente; test de dashboard. | Abierto |
| **R-14** | P3 | Mantenibilidad | Stores deprecados (`userStore`, `comunidadStore`, `habitanteStore`, `auditoriaStore`) y `formatters.formatName` (usa `.capitalize()` inexistente). | Código muerto y confusión. | Verificar imports y eliminar; si se necesita `formatName`, implementarlo correctamente. | Abierto |
| **R-15** | P3 | Configuración | `seed.js` asigna `cargo` (campo inexistente); `.env.example` no documenta `JWT_ACCESS_EXPIRES`/`JWT_REFRESH_EXPIRES`. | Configuración engañosa; expiraciones no evidentes. | Quitar `cargo`; documentar todas las variables usadas. | Abierto |
| **R-16** | P3 | API / contrato | `DELETE /comunidades/:id` responde `404` si ya está inactiva, en vez de un comportamiento idempotente. | Cliente debe tratar 404 en reintentos. | Decidir contrato (200 idempotente o 409) e implementarlo/documentarlo; tests. | Abierto |
| **R-17** | P3 | UX / formularios | Los errores de servidor se muestran solo con toast; no se mapean `errors[].campo` a inputs. | Mala experiencia de corrección. | Usar `setError(campo, { message })` cuando el backend devuelva `errors`; probar formularios. | Abierto |
| **R-18** | P3 | Seguridad / auditoría | `sanitizeBody` solo sanea el nivel superior; un objeto anidado con `password`/tokens no se sanea. | Posible fuga de secretos en logs de auditoría. | Sanitización profunda de claves sensibles; tests. | Abierto |
| **R-19** | P2 | Seguridad / auth | `PUT /profile/password` no revoca los refresh tokens existentes. | Una sesión robada sigue activa hasta 8 h tras cambiar la contraseña. | Revocar refresh tokens del usuario o usar `tokenVersion`/`passwordChangedAt`; tests. | Abierto |
| **R-20** | P2 | Integridad / comunidades | La comprobación de duplicados de comunidad es servicio-only y no hay índice único normalizado. | Duplicados por concurrencia. | Índice único con collation case-insensitive sobre `nombre+municipio+estado` o transacción; manejar `11000`; tests. | Abierto |
| **R-21** | P3 | Documentación | `README.md` y `backend_api_guide.md` estaban desactualizados. | Onboarding y contratos incorrectos. | Reescritos y sincronizados el 2026-11-04. | **Resuelto** |
| **R-22** | P1 | Seguridad / flujo público | Rutas públicas en `backend/src/modules/bombonas/bombona.public.routes.js`; los rate limiters de `express-rate-limit` usan memoria por proceso y hay solo honeypot (sin CAPTCHA). | Un botnet o despliegue multi-instancia puede evadir límites; abuso distribuido o agotamiento del presupuesto por comunidad. | Antes de escalar, conectar store compartido (p. ej. Redis) y revisar cuotas; valorar CAPTCHA/antibot adaptativo. Se aplican 10 POST/h por IP, 100/h por comunidad+IP y validación/idempotencia server-side. | **Parcialmente mitigado** (2026-11-05; pendiente prueba HTTP de límites/store compartido) |
| **R-23** | P1 | Integridad / pagos | Total y precios del pago de Bombonas. | Un total cliente manipulado podía generar discrepancias contables. | El backend ignora campos desconocidos, calcula con la tarifa de la jornada y guarda snapshot en céntimos enteros; índices y transacción preservan unicidad/consistencia. | **Resuelto** (2026-11-05; pruebas de cálculo, rechazo de campos extras e idempotencia) |
| **R-24** | P1 | Seguridad / archivos | `backend/src/modules/bombonas/bombona.upload.js` acepta comprobante en memoria; valida extensión, MIME y firma. No hay escáner antimalware ni política automática de retención. | Archivo polimórfico/malicioso no detectado, presión de memoria/BD o conservación indefinida de comprobantes con PII. | Mantener descarga privada y `nosniff`; añadir análisis antimalware, controles de retención/borrado aprobado y revisar almacenamiento streaming/GridFS cuando aumente volumen. | **Parcialmente mitigado** (2026-11-05; pruebas de firma; pendiente pruebas HTTP de tamaño/descarga) |
| **R-25** | P2 | Privacidad / scoping público | `GET /api/publico/bombonas/comunidades/:comunidadId/jornada-activa` devuelve casas numéricas, nombre y datos Pago Móvil configurados (teléfono, documento, titular). | Enumeración de casas y exposición pública deliberada de datos personales del beneficiario de Pago Móvil. | La respuesta no incluye habitantes/pagos y usa `no-store`; confirmar consentimiento del titular, publicar solo campos estrictamente necesarios y revisar si se puede ocultar documento/titular. | **Parcialmente mitigado** (2026-11-05; sigue pendiente confirmar minimización/consentimiento) |
| **R-26** | P2 | UX / arquitectura frontend | `App.jsx` bloquea inicialmente todo el árbol de rutas mientras `authStore.initializeAuth()` intenta restaurar sesión, incluso para la ruta pública. | El formulario público depende de la disponibilidad/latencia del servicio de autenticación y puede mostrar una espera innecesaria. | Separar el bootstrap de rutas públicas o hacerlo no bloqueante para `/publico/*`, sin debilitar las rutas protegidas. | Abierto |
| **R-27** | P1 | Integridad / operación MongoDB | El alta de pagos usa transacción entre `JornadaBombona` y `PagoBombona`; MongoDB standalone no soporta transacciones multidocumento. | Los envíos públicos fallarán con error de infraestructura si el entorno no es replica set/sharded. | Confirmar topología replica set/sharded en todos los entornos antes de desplegar; mantener prueba de integración transaccional. Los índices críticos de Bombonas se crean explícitamente en startup. | Abierto (verificación operativa pendiente) |
| **R-28** | P2 | Disponibilidad / almacenamiento | `multer.memoryStorage()` conserva hasta 5 MiB por solicitud en memoria antes de persistir el Buffer en MongoDB. | Concurrencia distribuida puede causar presión de RAM y documentos/consultas pesados. | Monitorear concurrencia/heap; incorporar límite de concurrencia y evolucionar a almacenamiento streaming/GridFS con análisis y ciclo de vida si aumenta el tráfico. | Abierto |
| **R-29** | P1 | Integridad / vivienda | `Habitante` identifica vivienda con `{ calle, numeroCasa }`, pero `GET jornada-activa` publica solo `numeroCasa` y el alta valida existencia por `{ comunidad, numeroCasa }`. | Si distintas calles tienen la misma numeración, el formulario no puede identificar cuál vivienda origina el pago; queda asociada solo al número ambiguo. | En un cambio de contrato aprobado, incluir calle o un ID estable de vivienda/casa en selección y registro; alternativamente, demostrar y garantizar unicidad de `numeroCasa` por comunidad. | Abierto |

---

## Plan de remediación sugerido

Agrupar por módulo al planificar; no mezclar módulos completos en un mismo sprint.

### Fase 1 — Seguridad crítica (P0)

1. **R-01** en `comunidades` (backend) — resuelto.
2. **R-02** en `auth` (backend) — resuelto.
3. **R-03** en `auth` (backend/frontend) — resuelto; desplegar coordinadamente.

### Fase 2 — Seguridad e integridad (P1)

4. **R-04** en `comunidades`/`habitantes` (backend).
5. **R-05** en `habitantes` (backend).
6. **R-06** en `auth` (backend).
7. **R-07** y **R-08** en frontend/calidad.

### Fase 3 — Rendimiento, contrato y sesión (P2)

8. **R-09** y **R-12** (rendimiento).
9. **R-19** (sesión).
10. **R-20** (integridad).
11. **R-10**, **R-11** y **R-13** (contrato/mantenibilidad).

### Fase 4 — Limpieza y UX (P3)

12. **R-14**, **R-15**, **R-16**, **R-17** y **R-18**.

---

## Definición de terminado de un riesgo

- [ ] El cambio se limitó al módulo correspondiente.
- [ ] Se añadió o actualizó una prueba automatizada.
- [ ] Se verificó el caso feliz y el caso de acceso/entrada inválida.
- [ ] Se actualizaron `backend_api_guide.md`, `PROJECT_CONTEXT.md` y la documentación del módulo.
- [ ] Se actualizó este registro (estado + evidencia).
- [ ] Se actualizó `MEMORY.md` si cambió el estado global.
- [ ] Se presentó la propuesta de commit en español.
