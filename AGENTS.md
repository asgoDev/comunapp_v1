# AGENTS.md — ComunApp v1

> **Puerta de entrada obligatoria** para agentes de IA y desarrolladores.
> Este archivo contiene las reglas transversales indiscutibles y el índice de documentos que deben leerse según el ámbito. El detalle operativo vive en `.agents/rules/`; la memoria histórica y las decisiones de largo plazo viven en `MEMORY.md`, `conocimiento_back.md` y `conocimiento_front.md`.
>
> **Regla de oro:** si el código y la documentación discrepan, la verdad es el código. La documentación se corrige antes de cerrar la tarea.

---

## 1. Contexto del proyecto

**ComunApp v1** es una aplicación web de gestión comunitaria para Venezuela. Administra comunidades, calles, viviendas y habitantes, con acceso segmentado por rol y trazabilidad de acciones.

| Capa | Stack |
|---|---|
| Backend | Node.js >= 18, ES Modules, Express 4, Mongoose 8, Zod 3, JWT, bcrypt |
| Frontend | React 18, Vite 6, Tailwind CSS 3, TanStack Query v5, Zustand 5, react-hook-form + Zod, axios |
| Base de datos | MongoDB / Mongoose |
| Autenticación | Access token 15 min + refresh token 8 h; cookies `httpOnly` y header `Authorization` |
| Gestor de paquetes | **pnpm obligatorio** (prohibido `npm` y `yarn`) |

**Roles reales:** `admin`, `JEFE_COMUNIDAD`, `LIDER_CALLE`.

**Módulos backend:** `auth`, `users`, `comunidades`, `habitantes`, `dashboard`, `auditoria`, `profile`.
**Módulos frontend:** Login, Dashboard, Comunidades, Habitantes, Usuarios, Auditoría, Perfil.

---

## 2. Reglas transversales obligatorias

1. **Focalización modular por sprint (un módulo por ámbito).**
   - **OBLIGATORIO**: cada sprint se concentra en **un único módulo y en una sola capa a la vez** (Backend o Frontend). Ejemplo: si se implementa `habitantes` en Backend, el trabajo se limita a sus rutas, controladores, servicios, modelos y validaciones.
   - **Separación de capas**: el consumo desde Frontend de un endpoint recién creado se planifica en un sprint posterior e independiente.
   - **PROHIBIDO**: desarrollar o modificar módulos completos adicionales en el mismo sprint, salvo orden explícita del usuario.
   - **Cambios colaterales**: si es indispensable tocar otro módulo, aplica solo el cambio mínimo y directamente relacionado. Si el impacto es amplio, **detente y consulta** antes de proceder.

2. **Seguridad absoluta (zero-leak de secretos).**
   - **PROHIBIDO**: hardcodear API keys, tokens, contraseñas, cadenas de conexión, JWT secrets o cualquier dato sensible en código, configuración o documentación.
   - **OBLIGATORIO**: leer secretos de variables de entorno (`process.env.*` en backend; `import.meta.env.*` en frontend) y registrar solo plantillas sin valores reales en `.env.example`.
   - **PROHIBIDO**: leer, imprimir, copiar o pegar en el chat el contenido de archivos `.env` reales.

3. **Seguridad sobre facilidad (cero atajos).**
   - **PROHIBIDO**: sacrificar seguridad, robustez o mejores prácticas para obtener un resultado rápido.
   - **OBLIGATORIO**: mantener validación, autorización, sanitización y manejo centralizado de errores aunque implique más pasos o pruebas.
   - No desactivar `helmet`, CORS con credenciales, rate limiting, `express-mongo-sanitize`, la validación Zod ni la autenticación para “probar” algo.

4. **Alerta temprana y notificación de brechas.**
   - **OBLIGATORIO**: notificar de inmediato y de forma explícita cualquier riesgo o vulnerabilidad potencial: IDOR, scoping multi-tenant incompleto, XSS, inyección NoSQL/ReDoS, fuga de PII, tokens expuestos, condiciones de carrera o cambios de contrato inseguros.
   - El aviso debe incluir: archivo/ruta afectada, impacto, y recomendación mínima. Si el riesgo es crítico, no lo dejes solo en la documentación: dilo en la respuesta.

5. **Concisión en el chat (cero redundancia con la documentación).**
   - **PROHIBIDO**: repetir en el chat resúmenes extensos de cambios que ya están en `walkthrough.md` o en `documentacion/implementado_*.md`.
   - **OBLIGATORIO**: respuestas breves, con rutas de archivo y referencias a los artefactos. Si no existe `walkthrough.md`, resume en pocas viñetas y remite al registro documental.

6. **Propuesta de commit en español.**
   - Al cerrar cada implementación o refactorización, presenta **siempre** una propuesta de commit en español con estándar semántico: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:` o `perf:`.
   - Incluye título claro y resumen de cambios, verificación realizada y riesgos.
   - **No ejecutes el commit salvo instrucción explícita del usuario.**

7. **Tasklist dinámico en tiempo real.**
   - Durante cualquier plan o lista de tareas, usa checkboxes (`- [ ]` / `- [x]`) y actualízalos inmediatamente después de concluir cada tarea individual.
   - No agrupes varias tareas como completadas si no lo están; el usuario debe ver el avance real.

8. **Sincronización documental obligatoria.**
   - Tras un cambio de backend: actualizar [`backend_api_guide.md`](./backend_api_guide.md) y [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).
   - Tras un cambio relevante: registrar la entrada en [`documentacion/implementado_backend.md`](./documentacion/implementado_backend.md) o [`documentacion/implementado_frontend.md`](./documentacion/implementado_frontend.md).
   - Al cerrar un sprint: actualizar [`MEMORY.md`](./MEMORY.md) y, si hay una decisión durable, [`conocimiento_back.md`](./conocimiento_back.md) o [`conocimiento_front.md`](./conocimiento_front.md).
   - **Estado actual (2026-11-04):** `backend_api_guide.md` y `README.md` fueron reescritos y sincronizados. Mantenerlos al día con cada cambio; la verdad sigue siendo el código.

9. **Preservación de contratos y arquitectura.**
   - **PROHIBIDO** cambiar sin autorización: rutas, nombres de campos, formas de respuesta, roles, flujo de autenticación, semántica de borrado o estructura de módulos.
   - No introduzcas capas nuevas (repository, container DI, servicios externos) ni dependencias nuevas sin justificarlo y pedir aprobación.
   - La arquitectura actual es: `Route -> authenticate/authorize -> validate(Zod) -> Controller -> Service (singleton) -> Model -> JSON`.

10. **Verificación antes de cerrar.**
    - Backend: ejecutar `node --check` sobre los archivos tocados y, si aplica, smoke test HTTP contra la API.
    - Frontend: ejecutar `pnpm build` en `frontend/`.
    - No existe suite de tests automatizada todavía. Si tocas lógica crítica (auth, scoping, validaciones, cálculos), añade o propone tests y documenta la evidencia. No cierres con “debería funcionar”.

11. **Idioma y estilo.**
    - UI, mensajes de error, documentación y commits en **español**.
    - Los identificadores de dominio existentes están en español (`nombre`, `comunidad`, `calle`, `habitante`); consérvalos.
    - Respeta el estilo del archivo que tocas (comillas, punto y coma, indentación, JSDoc). No reformatees archivos completos por preferencia personal.

12. **Respeto por el trabajo existente.**
    - Revisa `git status` antes de editar. No sobrescribas cambios ajenos ni borres archivos sin verificar consumidores.
    - Si un archivo parece código muerto, confirma con búsquedas de imports/uso antes de eliminarlo.

13. **Consultas al usuario.**
    - Consulta antes de: cambios de contrato, migraciones de datos, nuevas dependencias, refactors amplios, cambios de roles/permisos, o cualquier acción destructiva.
    - Si una instrucción contradice una regla de seguridad, advierte el riesgo y solicita confirmación explícita.

---

## 3. Invariantes de dominio y seguridad

### 3.1 Matriz de alcance por rol

| Módulo | `admin` | `JEFE_COMUNIDAD` | `LIDER_CALLE` |
|---|---|---|---|
| Usuarios | CRUD total | CRUD solo de `LIDER_CALLE` de su comunidad | Sin acceso |
| Comunidades | CRUD total | Lectura de su comunidad | Sin acceso |
| Habitantes | CRUD total + carga masiva | Lectura de su comunidad | CRUD de habitantes de su calle |
| Dashboard | Métricas globales | Métricas de su comunidad | Métricas de su calle |
| Auditoría | Lectura | Sin acceso | Sin acceso |
| Perfil | Propio | Propio | Propio |

`GET /api/comunidades`, `GET /api/comunidades/:id` y `GET /api/comunidades/:id/resumen` aplican scoping desde el 2026-11-04: `JEFE_COMUNIDAD` solo accede a su comunidad; el acceso cruzado responde `403 FORBIDDEN` (R-01 resuelto).

### 3.2 Scoping multi-tenant

- `req.user` transporta solo `{ id, role }`. Los servicios que necesitan `comunidad`, `calle` o `estado` **releen al usuario desde la BD** para evitar datos obsoletos.
- `comunidad`, `calle` y `registradoPor` **nunca** se confían del body del cliente para `JEFE_COMUNIDAD` o `LIDER_CALLE`.
  - Excepción actual: `admin` puede enviar `comunidad` y `calle` al crear habitantes; `registradoPor` siempre se deriva del usuario autenticado.
- Los filtros de acceso se aplican **en el servidor** (servicio). Ocultar un botón en la UI no es una medida de seguridad.
- Un acceso cruzado debe responder `403 FORBIDDEN`; un recurso inexistente, `404` con su código específico.
- Todo endpoint nuevo que exponga datos comunitarios debe verificar explícitamente el scoping por comunidad/calle.

### 3.3 Datos y borrado

- `User` y `Comunidad` usan **soft delete** (`estado = 'inactivo'`, `activo = false`). `Habitante` usa **borrado físico** (contrato actual; no cambiar sin aprobación).
- La cédula de `User` es **inmutable** después de creado. La cédula de `Habitante` es opcional y única por comunidad.
- `Habitante.comunidad`, `Habitante.calle` y `Habitante.registradoPor` son campos protegidos: no se actualizan desde el cliente.
- Operaciones que afecten más de una colección deben usar sesión/transacción de MongoDB. Los CRUD actuales son de un solo documento.
- No construyas `$regex` con entrada del usuario sin escapar caracteres especiales.

### 3.4 Autenticación y sesión

- Contraseñas con bcrypt (12 rondas), `select: false` y eliminación en `toJSON`.
- JWT: `{ id, role }`; access 15 min, refresh 8 h (configurables por entorno).
- Refresh tokens revocados se guardan como hash SHA-256 en `TokenBlacklist` con TTL.
- El refresh rota de forma atómica: el token presentado se invalida en `TokenBlacklist` antes de emitir el nuevo par y cada refresh incluye un `jti` único (R-02 resuelto).
- **Deuda de seguridad:** el frontend persiste tokens en `localStorage`. No empeorar este patrón; evaluar migración a cookies `httpOnly` + memoria.

### 3.5 Validación y errores

- Zod valida en la ruta con `validate(schema)`; el servicio recibe datos ya saneados.
- La validación del frontend es UX, no una garantía de seguridad.
- Los errores operacionales usan `AppError(message, statusCode, code)` y el `errorHandler` centralizado.
- No expongas stacks, consultas Mongo ni detalles internos en producción.

---

## 4. Índice de documentos: qué leer y cuándo

| Documento | Cuándo leerlo | Contenido |
|---|---|---|
| [`MEMORY.md`](./MEMORY.md) | **Al inicio de cada sesión** y al cerrar un sprint | Estado actual, decisiones vigentes, riesgos y deudas |
| [`conocimiento_back.md`](./conocimiento_back.md) | Antes de tocar backend, auth, modelos, scoping o validaciones | Decisiones durables y trampas del backend |
| [`conocimiento_front.md`](./conocimiento_front.md) | Antes de tocar frontend, UI, formularios, hooks o auth | Decisiones durables y convenciones del frontend |
| [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) | Para entender el sistema completo o preparar un sprint | Contexto global, arquitectura, módulos, modelo de datos |
| [`backend_api_guide.md`](./backend_api_guide.md) | Para integrar o documentar endpoints | Contrato HTTP completo y actualizado |
| [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md) | Al planificar remediaciones o tocar auth/scoping | Registro priorizado de riesgos, impacto y plan de remediación |
| [`.agents/rules/regla_backend.md`](./.agents/rules/regla_backend.md) | **Obligatorio** en cualquier cambio de backend | Reglas, checklist y convenciones backend |
| [`.agents/rules/regla_frontend.md`](./.agents/rules/regla_frontend.md) | **Obligatorio** en cualquier cambio de frontend | Reglas, checklist y convenciones frontend |
| [`.agents/rules/regla_documentacion.md`](./.agents/rules/regla_documentacion.md) | Antes de cerrar cualquier tarea | Protocolo documental y propuesta de commit |
| [`documentacion/implementado_backend.md`](./documentacion/implementado_backend.md) | Para consultar historial backend | Registro cronológico de implementaciones |
| [`documentacion/implementado_frontend.md`](./documentacion/implementado_frontend.md) | Para consultar historial frontend | Registro cronológico de implementaciones |
| `documentacion/local/` | Para planes de sprint locales | Planes y matrices **no versionados** (ver `.gitignore`) |
| [`README.md`](./README.md) | Para instalación/arranque | Setup, stack, scripts y documentación del proyecto |

> **Nota para Cursor:** si se usa `.cursor/rules/`, sus archivos deben ser espejos de `.agents/rules/` o enlazar a ellos. No mantengas dos versiones divergentes de la misma regla.

---

## 5. Flujo de trabajo obligatorio

### 5.1 Pre-vuelo

- [ ] Leer `AGENTS.md`, `MEMORY.md` y la regla del ámbito.
- [ ] Revisar `git status` y el estado del árbol de trabajo.
- [ ] Identificar el módulo exacto y confirmar que no se tocarán módulos completos adicionales.
- [ ] Revisar la matriz de roles y el scoping del endpoint afectado.
- [ ] Identificar contratos existentes que no deben romperse.
- [ ] Registrar riesgos y crear el tasklist con checkboxes.

### 5.2 Implementación

- [ ] Aplicar el cambio mínimo necesario.
- [ ] Mantener Zod, `AppError`, `authenticate`/`authorize` y el scoping en servidor.
- [ ] No introducir secretos, dependencias ni capas nuevas.
- [ ] Actualizar el tasklist tras cada tarea.
- [ ] Si aparece un impacto colateral amplio, detenerse y consultar.

### 5.3 Post-vuelo

- [ ] Ejecutar `node --check` (backend) o `pnpm build` (frontend).
- [ ] Hacer smoke test o verificación manual si el cambio lo requiere.
- [ ] Buscar regresiones con `grep` (campos viejos, imports rotos, rutas cambiadas).
- [ ] Actualizar `backend_api_guide.md` / `PROJECT_CONTEXT.md` si aplica.
- [ ] Registrar en `documentacion/implementado_*.md`.
- [ ] Actualizar `MEMORY.md` si se cierra un sprint o cambia una decisión.
- [ ] Presentar propuesta de commit en español.
- [ ] Responder en el chat de forma concisa, con enlaces a los documentos.

---

## 6. Criterio de conflicto y excepciones

1. Prevalece la instrucción explícita del usuario.
2. Luego, la regla específica del ámbito (`.agents/rules/`).
3. Luego, este archivo.
4. Luego, el código existente como referencia de estilo y contrato.

Una excepción a una regla de seguridad **no** se aplica por conveniencia: requiere autorización explícita del usuario y debe quedar registrada en `MEMORY.md` con fecha, motivo y alcance. Nunca se autoriza exponer secretos, contraseñas o tokens.

---

## 7. Checklist rápido de cierre

- [ ] ¿El cambio se limitó al módulo acordado?
- [ ] ¿Se respetó el scoping por `comunidad`/`calle` y los roles?
- [ ] ¿Se validó con Zod en backend y se mantuvo la validación frontend?
- [ ] ¿Se evitó exponer secretos, tokens, contraseñas o PII?
- [ ] ¿Se verificó con `node --check` / `pnpm build`?
- [ ] ¿Se actualizaron los documentos obligatorios?
- [ ] ¿Se presentó la propuesta de commit en español?
- [ ] ¿Se comunicaron los riesgos de seguridad detectados?
