# Implementado — Frontend

> Registro cronológico de implementaciones, refactorizaciones y auditorías del frontend.
> La verdad es el código; este archivo resume la evidencia. Para decisiones durables, ver [`conocimiento_front.md`](../conocimiento_front.md).

---

## 2026-11-09 — Integración pública de Bombonas

- **Objetivo:** conectar la vista pública con el API de Bombonas, actualizarla al contrato calle+casa y optimizar comprobantes localmente sin guardar PII ni tokens en almacenamiento persistente.
- **Archivos:** `frontend/src/pages/Publico/PagoBombonasPage.jsx`; `frontend/src/services/publicApi.js`; `frontend/src/services/bombonaPublicaService.js`; `frontend/src/hooks/useBombonaPublicaQueries.js`; `frontend/src/utils/{bombonaImage,bombonaErrors,idempotencyKey,routeAccess}.js`; `frontend/src/validations/pagoBombonas.js`; `frontend/src/App.jsx`; `frontend/.env.example`; `frontend/test/bombonaPublica.test.js`.
- **Cambios:**
  - Ruta pública consulta jornada y viviendas reales; bootstrap y chequeos de auth se omiten solo en `/publico/*`.
  - Selección dinámica calle→casa; precios/Pago Móvil desde API; errores para jornada cerrada, enlace inválido, comunidad sin viviendas y fallos de red/Cloudinary.
  - Cliente público aislado del axios autenticado; envío multipart con UUID v4 `Idempotency-Key`, sin precios, total ni credenciales.
  - JPG/PNG únicamente; Canvas recodifica a JPEG con calidad/dimensión configurables, límite de salida 5 MiB y fallback al original compatible cuando cabe.
  - Confirmación usa código/total devuelto por servidor; reintentos conservan clave para el mismo payload y no hay persistencia de File/PII/token.
- **Verificación:** `frontend/pnpm test` → 18/18 OK; `frontend/pnpm build` → 505 módulos, 0 errores; `git diff --check` OK. Warnings existentes: Browserslist desactualizado y chunk principal >500 kB.
- **Riesgos / pendientes:** R-26 y R-32 resueltos. No se probó subida real: falta configurar Cloudinary y el backend/Mongo en el entorno. R-24 antivirus, R-30 compartición temporal, R-31 compensación de assets y scheduler siguen documentados.

---

## 2026-11-04 — R-03 frontend: sesión en memoria y fallback iOS

- **Objetivo:** eliminar tokens de `localStorage`, usar el refresh solo por cookie `HttpOnly` y degradar a login cuando iOS cross-site bloquea la cookie.
- **Archivos:** `authStore.js`, `api.js`, `authService.js`, `App.jsx`, `LoginPage.jsx`, `frontend/package.json`, `frontend/test/auth.test.js`.
- **Cambios:**
  - `authStore` sin `persist`: solo `user`, `isAuthenticated` y `accessToken` en memoria.
  - Limpieza de la entrada heredada `auth-storage`.
  - `initializeAuth` restaura con `/auth/refresh` + `/auth/me`, deduplicado para StrictMode.
  - Interceptor con una sola promesa de refresh compartida; sin token en body ni `localStorage`.
  - Fallo de refresh: limpia estado y caché de TanStack Query y muestra aviso genérico.
  - Logout limpia cookies, estado y caché.
  - `App.jsx` ya no usa expiración local artificial.
- **Verificación:** `pnpm test` → 9/9 OK (store, concurrencia, ausencia de cookie, logout y limpieza de caché); `pnpm build` → 496 módulos, 0 errores (solo warning de tamaño de chunk).
- **iOS:** la prueba automatizada simula ausencia de cookie y confirma que no hay llamada a `/me` ni sesión. Falta validación física en dispositivo, recomendada antes de producción.
- **Riesgos:** R-03 resuelto. R-06 (CSRF) sigue abierto.

---

## 2026-11-04 — Línea base documental (sin cambios de código)

- **Objetivo:** documentar el estado real del frontend y establecer la gobernanza del proyecto.
- **Módulos verificados:** Login, Dashboard, Comunidades, Habitantes, Usuarios, Auditoría y Perfil.
- **Archivos revisados:** `App.jsx`, `main.jsx`, `api.js`, `authStore`, `uiStore`, hooks de TanStack Query, services, validaciones, layout, componentes UI, `formatters.js`, `pdfExport.js`, `tailwind.config.js` e `index.css`.
- **Cambios:** ninguno en código de aplicación. Se crearon `AGENTS.md`, `MEMORY.md`, `PROJECT_CONTEXT.md`, `conocimiento_back.md`, `conocimiento_front.md` y las reglas en `.agents/rules/`.
- **Verificación:** `pnpm build` ejecutado en `frontend/`: **496 módulos transformados, 0 errores**. Warnings preexistentes: chunk principal de 972.50 kB y dynamic import de `authStore` (también importado estáticamente).
- **Riesgos / deudas (estado de la línea base):** tokens en `localStorage` (resuelto después como R-03), guardas de rol duplicadas, `limit=9999` en habitantes, errores de servidor sin mapeo a inputs, código muerto y ausencia de tests. Ver [`MEMORY.md`](../MEMORY.md).

---

## 2026-11-04 — Consolidación documental (sin cambios de código)

- **Objetivo:** cerrar la deuda documental y dejar un registro accionable de los riesgos detectados.
- **Archivos:** [`README.md`](../README.md) reescrito como documentación real de ComunApp; [`documentacion/riesgos_pendientes.md`](./riesgos_pendientes.md) creado con R-01 a R-21; [`MEMORY.md`](../MEMORY.md), [`PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`AGENTS.md`](../AGENTS.md), [`conocimiento_front.md`](../conocimiento_front.md) y [`.agents/rules/`](../.agents/rules/) sincronizados.
- **Cambios:** documentación únicamente. No se modificó código de aplicación.
- **Verificación:** `pnpm build` en `frontend/`: 496 módulos, 0 errores; warnings preexistentes (chunk 972.50 kB y dynamic import de `authStore`). Enlaces relativos de Markdown: OK.
- **Riesgos / deudas:** R-21 resuelto. El resto queda abierto en el registro, priorizado por fases.

---

## 2026-11-04 — Formulario público de prueba para pagos de bombonas

- **Objetivo:** crear una vista frontend pública para visualizar y validar el flujo de solicitud de bombonas asociado a una comunidad.
- **Archivos:** [`frontend/src/pages/Publico/PagoBombonasPage.jsx`](../frontend/src/pages/Publico/PagoBombonasPage.jsx), [`frontend/src/validations/pagoBombonas.js`](../frontend/src/validations/pagoBombonas.js), [`frontend/src/App.jsx`](../frontend/src/App.jsx).
- **Cambios:**
  - Se añadió la ruta pública `/publico/pago-bombonas/:comunidadId`, fuera de `ProtectedRoute` y `AppLayout`.
  - Se incorporaron datos mock de comunidad, casas numéricas y precios referenciales.
  - Se añadieron selectores de cantidad para bombonas grandes, medianas y pequeñas, con cálculo reactivo del total en VES.
  - Se agregaron campos obligatorios para casa, propietario, referencia y comprobante de pago.
  - La confirmación de envío es simulada; no se usa axios, no se persisten datos y no se implementó backend.
- **Verificación:** `frontend/pnpm build` → 498 módulos, 0 errores; `frontend/pnpm test` → 9/9 pruebas OK. Warnings: chunk principal mayor a 500 kB y Browserslist desactualizado.
- **Riesgos / deudas:** R-22 a R-26 agregados al registro de riesgos. Antes de conectar backend deben resolverse abuso del flujo público, autoridad del cálculo/precios, seguridad de archivos, exposición de datos comunitarios y bootstrap de autenticación global.
