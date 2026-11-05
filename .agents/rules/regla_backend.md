# Regla Backend — ComunApp v1

> **Obligatoria** para cualquier cambio en `backend/`. Se complementa con [`AGENTS.md`](../../AGENTS.md), [`conocimiento_back.md`](../../conocimiento_back.md) y [`MEMORY.md`](../../MEMORY.md).
>
> Si hay conflicto: instrucción explícita del usuario > esta regla > `AGENTS.md` > código existente.

---

## 1. Ámbito y enfoque

- Un sprint = **un módulo backend** (auth, users, comunidades, habitantes, dashboard, auditoria o profile).
- No modifiques módulos completos adicionales. Si necesitas un ajuste colateral, que sea mínimo y directamente relacionado.
- Si el cambio afecta contratos, roles, autenticación o estructuras de datos de forma amplia: **detente y consulta**.
- No introduzcas capas nuevas (repository, DI container, servicios externos) ni dependencias sin aprobación.

---

## 2. Pre-vuelo obligatorio

- [ ] Leer `AGENTS.md`, `MEMORY.md`, esta regla y `conocimiento_back.md`.
- [ ] Revisar `git status` y no pisar cambios ajenos.
- [ ] Identificar el módulo y los archivos exactos.
- [ ] Verificar la matriz de roles y el scoping del endpoint.
- [ ] Revisar el contrato actual en rutas, controladores, servicios, modelos y validaciones.
- [ ] Identificar riesgos de seguridad y datos afectados.
- [ ] Crear tasklist con checkboxes.

---

## 3. Arquitectura y convenciones

```text
Route -> authenticate/authorize -> validate(Zod) -> Controller -> Service (singleton) -> Model -> JSON
```

- Rutas en `*.routes.js`; controladores en `*.controller.js`; lógica en `*.service.js`; esquemas Mongoose en `*.model.js`; validación Zod en `*.validation.js`.
- Controladores delgados: orquestan, responden y llaman `next(error)`.
- Servicios singleton: `class XService` + `export default new XService()`.
- Errores de negocio con `new AppError(message, statusCode, code)`.
- Imports ESM con extensión `.js`.
- Comentarios, mensajes y JSDoc en español.
- Respeta el estilo de comillas/punto y coma del archivo; no reformatees todo.
- No uses `mongoose.model('X')` si puedes importar el modelo directamente.

---

## 4. Scoping multi-tenant (regla crítica)

- `req.user` solo contiene `{ id, role }`; **no** contiene `comunidad` ni `calle` actualizadas.
- Relee al usuario desde la BD cuando necesites `role`, `comunidad`, `calle` o `estado`.
- Filtros por rol:
  - `admin`: sin restricción.
  - `JEFE_COMUNIDAD`: `{ comunidad: authUser.comunidad }`.
  - `LIDER_CALLE`: `{ comunidad: authUser.comunidad, calle: authUser.calle }`.
- En creación/actualización:
  - `comunidad`, `calle` y `registradoPor` se derivan del usuario autenticado.
  - Se descartan del body para `JEFE_COMUNIDAD` y `LIDER_CALLE`.
  - Excepción: `admin` puede enviar `comunidad` y `calle` al crear habitantes; `registradoPor` siempre se deriva.
- Verifica propiedad antes de leer/actualizar/eliminar un recurso individual.
- Acceso cruzado → `403 FORBIDDEN`; recurso inexistente → `404` con código específico.
- **Nunca** confíes en el frontend para aplicar el scoping.
- Endpoint nuevo con datos comunitarios = prueba/verificación explícita de acceso cruzado.

### Matriz de permisos

| Módulo | `admin` | `JEFE_COMUNIDAD` | `LIDER_CALLE` |
|---|---|---|---|
| Usuarios | CRUD total | Solo `LIDER_CALLE` de su comunidad | — |
| Comunidades | CRUD total | Lectura de su comunidad | — |
| Habitantes | CRUD + bulk | Lectura de su comunidad | CRUD de su calle |
| Dashboard | Global | Su comunidad | Su calle |
| Auditoría | Lectura | — | — |
| Perfil | Propio | Propio | Propio |
| Bombonas | Jornadas/pagos globales | Jornadas/pagos de su comunidad | — |

`GET /comunidades`, `/:id` y `/:id/resumen` aplican scoping desde el 2026-11-04 (R-01 resuelto). Un jefe solo accede a su comunidad y el acceso cruzado responde `403`.

---

## 5. Modelos y datos

- `User`:
  - `cedula` única e inmutable; no incluirla en `updateUserSchema`.
  - `password` con bcrypt 12, `select: false`, eliminado en `toJSON`.
  - `comunidad` requerida para `JEFE_COMUNIDAD` y `LIDER_CALLE`; `calle` requerida para `LIDER_CALLE`.
  - Solo `admin` puede cambiar `role`; `JEFE_COMUNIDAD` no puede elevar roles y el servicio fuerza `LIDER_CALLE`.
  - Soft delete con `estado`.
- `Comunidad`:
  - Soft delete con `activo`.
  - Duplicado por `nombre + municipio + estado` entre activas.
- `Habitante`:
  - `comunidad`, `calle` y `registradoPor` protegidos.
  - Cédula opcional y única por comunidad (validación de servicio).
  - Borrado físico (contrato actual).
- No cambies la semántica de borrado sin aprobación.
- Si una operación escribe en varias colecciones, usa sesión/transacción de MongoDB.
- No construyas `$regex` con entrada del usuario sin escapar (ReDoS/falsos matches).
- Añade índices solo con justificación y midiendo impacto.

---

## 6. Validación y errores

- Todo body se valida con Zod en la ruta: `validate(schema)`.
- El servicio no debe llamar `.parse()` otra vez; recibe datos saneados.
- Usa `emptyToNull` para opcionales/nullables y normaliza:
  - cédula → mayúsculas,
  - email → minúsculas,
  - strings → `trim`.
- `update` debe exigir al menos un campo.
- Mensajes en español y con el nombre exacto del campo.
- Errores operacionales con `AppError`; no devuelvas strings sueltos.
- No expongas detalles internos en producción.
- Mantén las formas de respuesta existentes:
  - listas: `{ <colección>, pagination }`,
  - mutaciones: `{ message, <entidad> }`,
  - errores: `{ success: false, message, code? }`.

---

## 7. Autenticación y seguridad

- JWT payload mínimo: `{ id, role }`.
- Access 15 min / refresh 8 h (configurables).
- Cookies `httpOnly`; `secure` y `sameSite: 'none'` en producción (despliegue cross-site actual).
- El refresh token solo viaja por cookie `HttpOnly`; nunca en JSON ni en body. El access token puede devolverse en JSON para usarlo en memoria + `Authorization`.
- Revocación de refresh con hash SHA-256 en `TokenBlacklist`; la rotación consume el token anterior de forma atómica y cada refresh lleva `jti` único.
- No desactives `helmet`, CORS con credenciales, rate limiting, `express-mongo-sanitize` ni la validación.
- No loguees passwords, tokens, cookies, PII ni contenido de `.env`.
- No añadas secretos al código; usa `.env` y actualiza `.env.example` con placeholders.
- Si tocas auth/refresh, revisa:
  - rotación e invalidación del refresh anterior,
  - expiración,
  - cookies,
  - enumeración de usuarios,
  - CSRF si se usan cookies.
- CORS: usa allowlist explícita; nunca `*` con credenciales.

---

## 8. Auditoría

- El middleware global audita `POST`, `PUT`, `PATCH`, `DELETE`.
- Debe seguir siendo fire-and-forget: un fallo de auditoría no rompe la petición.
- Sanea `password`, `confirmPassword`, `accessToken`, `refreshToken` (y equivalentes anidados si se añaden).
- `accion` permitida: `CREAR | ACTUALIZAR | ELIMINAR`.
- No inventes `LOGIN`/`CERRAR_SESION` sin migrar el enum del modelo.
- Todo endpoint de escritura nuevo queda auditado automáticamente; verifica que el `modulo` se extraiga bien de la URL.

---

## 9. Post-vuelo obligatorio

- [ ] `node --check` sobre los archivos tocados.
- [ ] Smoke test HTTP si el endpoint lo permite (login, rol, scoping, error, éxito).
- [ ] Verificar respuestas y códigos de estado.
- [ ] `grep` de regresiones: campos viejos, rutas, imports, roles.
- [ ] Actualizar [`backend_api_guide.md`](../../backend_api_guide.md) si cambió un endpoint, DTO, middleware o validación.
- [ ] Actualizar [`PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md).
- [ ] Actualizar [`documentacion/riesgos_pendientes.md`](../../documentacion/riesgos_pendientes.md) si se detectó o resolvió un riesgo.
- [ ] Registrar en [`documentacion/implementado_backend.md`](../../documentacion/implementado_backend.md).
- [ ] Actualizar `MEMORY.md` si se cierra sprint o cambia una decisión.
- [ ] Presentar propuesta de commit en español.
- [ ] Comunicar riesgos de seguridad detectados.

---

## 10. Prohibiciones explícitas

- Hardcodear secretos, URLs de producción o credenciales.
- Desactivar validación/autorización “temporalmente”.
- Usar `findById` sin verificar scoping cuando el recurso es comunitario.
- Confiar en `comunidad`, `calle` o `registradoPor` del body para roles no admin.
- Devolver `password`, `refreshToken` o datos internos en respuestas no previstas.
- Cambiar la forma de respuesta o los nombres de campos sin aprobación.
- Introducir `npm`/`yarn` o mezclar gestores.
- Añadir dependencias sin justificación y aprobación.
- Ejecutar migraciones o borrados masivos sin confirmación.
