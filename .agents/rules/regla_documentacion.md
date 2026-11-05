# Regla de Documentación y Cierre — ComunApp v1

> **Obligatoria** antes de cerrar cualquier tarea, sprint o refactorización. Se complementa con [`AGENTS.md`](../../AGENTS.md) y [`MEMORY.md`](../../MEMORY.md).

---

## 1. Principio rector

**La verdad está en el código.** Los documentos son una síntesis viva; si discrepan del código, se corrige el documento. No se conservan planes preliminares como si fueran estado real.

---

## 2. Comunicación en el chat

- Respuestas **concisas y directas**.
- No dupliques en el chat el contenido extenso de `walkthrough.md` ni de `documentacion/implementado_*.md`.
- Si existe `walkthrough.md`, referencia su ruta y resume solo lo imprescindible.
- Si no existe, usa como máximo unas pocas viñetas: qué cambió, verificación, riesgos y siguiente paso.
- Incluye siempre rutas de archivo relevantes.
- Los riesgos de seguridad se comunican **siempre**, aunque el resto se remita a la documentación.

---

## 3. Documentos y responsabilidades

| Documento | Cuándo se actualiza | Qué contiene |
|---|---|---|
| [`backend_api_guide.md`](../../backend_api_guide.md) | Cambios de endpoints, DTOs, middlewares o validaciones backend | Rutas, métodos, payloads, respuestas y códigos |
| [`PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md) | Cambios relevantes de arquitectura, módulos, roles o flujos | Contexto global sintetizado |
| [`documentacion/riesgos_pendientes.md`](../../documentacion/riesgos_pendientes.md) | Se detecta un riesgo, cambia su prioridad o se resuelve | Registro priorizado, impacto, remediación y estado |
| [`documentacion/implementado_backend.md`](../../documentacion/implementado_backend.md) | Cada implementación backend | Registro cronológico: fecha, módulo, archivos, verificación, riesgos |
| [`documentacion/implementado_frontend.md`](../../documentacion/implementado_frontend.md) | Cada implementación frontend | Registro cronológico: fecha, módulo, archivos, verificación, riesgos |
| [`MEMORY.md`](../../MEMORY.md) | Cierre de sprint o cambio de decisión | Estado actual, decisiones, riesgos y deudas (máx. ~100 líneas) |
| [`conocimiento_back.md`](../../conocimiento_back.md) | Decisión durable de backend | Arquitectura, contratos, invariantes, trampas |
| [`conocimiento_front.md`](../../conocimiento_front.md) | Decisión durable de frontend | Arquitectura, convenciones, seguridad, deudas |
| `documentacion/local/` | Planes de sprint y matrices locales | **No versionado** (ver `.gitignore`) |

---

## 4. Sincronización de `backend_api_guide.md`

Es **obligatoria** tras cada cambio de backend que afecte:

- rutas o métodos,
- body/query params,
- formas de respuesta,
- códigos de error,
- autenticación/autorización,
- validaciones,
- middleware de auditoría.

Checklist de la guía:

- [ ] Ruta y método exactos.
- [ ] Roles permitidos.
- [ ] Headers requeridos.
- [ ] Body/query con tipos y obligatoriedad.
- [ ] Respuesta exitosa de ejemplo.
- [ ] Errores relevantes con status y `code`.
- [ ] Efecto de scoping multi-tenant.
- [ ] Nombres de campos idénticos al código.

**Estado actual (2026-11-04):** la guía fue reescrita y sincronizada con todos los módulos. Mantenerla al día en cada cambio de backend; si hay duda, prevalece el código.

---

## 5. Sincronización de `PROJECT_CONTEXT.md`

Actualízalo cuando cambie:

- un módulo o su responsabilidad,
- un rol o permiso,
- una regla de negocio,
- un flujo principal (login, scoping, carga masiva, auditoría, PDF),
- la arquitectura o una decisión estructural,
- el estado de una deuda relevante.

Mantén el documento **sintetizado**; no lo conviertas en un changelog. El detalle histórico va en `implementado_*.md`.

---

## 6. Registro de implementaciones

Formato sugerido para cada entrada:

```markdown
## YYYY-MM-DD — <Módulo> (<Backend|Frontend>)

- **Objetivo:** ...
- **Archivos:** ...
- **Cambios:** ...
- **Verificación:** ...
- **Riesgos / deudas:** ...
```

Reglas:

- Una entrada por implementación o sprint.
- Fecha en formato ISO.
- Enlazar archivos con rutas relativas.
- No borrar entradas anteriores.
- Si algo quedó pendiente, registrarlo explícitamente.

---

## 7. `MEMORY.md`

- Máximo aproximado: **100 líneas**.
- Debe reflejar el estado **actual**, no todo el historial.
- Actualizar al cerrar cada sprint o cuando cambie una decisión importante.
- Secciones mínimas: identidad, roles/alcance, estado actual, decisiones vigentes, riesgos/deudas, próximos pasos, referencias.
- Mover el detalle histórico a `documentacion/implementado_*.md`.
- Si una deuda se resuelve, elimínala o márcala como resuelta con fecha.

---

## 8. Conocimiento de largo plazo

- `conocimiento_back.md` y `conocimiento_front.md` no son changelogs: son memoria de decisiones y convenciones.
- Actualízalos cuando:
  - se cierre una decisión de arquitectura,
  - se adopte un patrón nuevo,
  - se descubra una trampa recurrente,
  - cambie una regla de seguridad,
  - se modifique un contrato estable.
- Explica el **porqué**, no solo el **qué**.
- No dupliques el contenido de `MEMORY.md`; enlaza.

---

## 9. Documentación local (`documentacion/local/`)

- Destino: planes de sprint, matrices, auditorías y notas de trabajo.
- **No se versiona.** Añadir `documentacion/local/` al `.gitignore` raíz.
- Puede contener detalles operativos, pero no secretos ni datos personales reales.
- Los planes preliminares dejan de ser verdad tras implementar; si se conservan, marcar su estado.

---

## 10. Propuesta de commit

Presentar **siempre** al cerrar una implementación o refactorización:

```text
<tipo>(<ámbito>): <título en imperativo>

- Qué se cambió.
- Por qué.
- Verificación realizada.
- Riesgos o deudas pendientes.
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`.
Ámbito sugerido: `backend`, `frontend`, `docs`, `auth`, `habitantes`, etc.

**No ejecutes el commit** salvo instrucción explícita del usuario.

---

## 11. Checklist de cierre documental

- [ ] ¿Se actualizó `backend_api_guide.md` si cambió el backend?
- [ ] ¿Se actualizó `PROJECT_CONTEXT.md` si cambió un flujo, rol o módulo?
- [ ] ¿Se actualizó `documentacion/riesgos_pendientes.md` si se detectó o resolvió un riesgo?
- [ ] ¿Se registró la entrada en `documentacion/implementado_backend.md` o `documentacion/implementado_frontend.md`?
- [ ] ¿Se actualizó `MEMORY.md` si se cerró sprint o cambió una decisión?
- [ ] ¿Se actualizó `conocimiento_back.md` / `conocimiento_front.md` si la decisión es durable?
- [ ] ¿Se marcó como resuelta alguna deuda?
- [ ] ¿La respuesta del chat es concisa y sin duplicar el registro?
- [ ] ¿Se presentó la propuesta de commit en español?
- [ ] ¿Se comunicaron los riesgos de seguridad?

---

## 12. Estado de la deuda documental

1. `backend_api_guide.md` y `README.md` fueron reescritos y sincronizados el 2026-11-04. **Resuelto (R-21).**
2. El registro de riesgos vive en [`documentacion/riesgos_pendientes.md`](../../documentacion/riesgos_pendientes.md); debe actualizarse al detectar o resolver un riesgo.
3. No hay `walkthrough.md` ni bitácora histórica previa; la línea base del 2026-11-04 inicia el registro en `documentacion/implementado_*.md`.
4. No hay tests documentados; cuando se añadan, registrar comando y cobertura.
