# Regla Frontend — ComunApp v1

> **Obligatoria** para cualquier cambio en `frontend/`. Se complementa con [`AGENTS.md`](../../AGENTS.md), [`conocimiento_front.md`](../../conocimiento_front.md) y [`MEMORY.md`](../../MEMORY.md).
>
> Si hay conflicto: instrucción explícita del usuario > esta regla > `AGENTS.md` > código existente.

---

## 1. Ámbito y enfoque

- Un sprint = **un módulo frontend** (login, dashboard, comunidades, habitantes, usuarios, auditoría o perfil).
- No desarrolles vistas, hooks y servicios de varios módulos completos en el mismo sprint.
- Ajustes colaterales: solo los mínimos e imprescindibles; si el impacto es amplio, consulta.
- Si la UI necesita un endpoint nuevo, primero se implementa y documenta el backend en un sprint separado.
- No introduzcas dependencias nuevas (UI kit, state manager, fetch library) sin aprobación.

---

## 2. Pre-vuelo obligatorio

- [ ] Leer `AGENTS.md`, `MEMORY.md`, esta regla y `conocimiento_front.md`.
- [ ] Revisar `git status` y no pisar cambios ajenos.
- [ ] Identificar la página, hook, service, validación y store afectados.
- [ ] Verificar el rol que puede acceder y el endpoint que consume.
- [ ] Revisar los tokens de diseño y componentes UI existentes.
- [ ] Identificar riesgos de XSS, exposición de tokens, datos personales o rendimiento.
- [ ] Crear tasklist con checkboxes.

---

## 3. Arquitectura y flujo de datos

```text
Page -> hook (TanStack Query) -> service (axios) -> /api/* -> cache -> render
```

- **Nunca** llames axios directamente desde una página o componente.
- **Services** (`src/services/*.js`): solo llamadas HTTP y retorno de la promesa.
- **Hooks** (`src/hooks/use*Queries.js`): `useQuery`/`useMutation`, `.then((res) => res.data)`, invalidaciones.
- **Páginas** (`src/pages/<Modulo>/`): composición, guardas de rol, estado local de UI.
- **Componentes UI** (`src/components/ui/`): reutilizables y sin lógica de negocio.
- **Validaciones** (`src/validations/`): schemas Zod por módulo.
- **Utils** (`src/utils/`): funciones puras y helpers.

### Query keys

- Lista: `['<modulo>', 'list', { page, ...filters }]`.
- Detalle: `['<modulo>', 'detail', id]`.
- Dropdown: `['<modulo>', 'dropdown']`.
- Resumen: `['<modulo>', 'resumen', id]`.
- Dashboard: `['dashboard', 'stats']`.
- Perfil: `['profile']`.
- Auditoría: `['auditoria', 'logs', { page, ...filters }]`.

Las mutaciones deben invalidar la lista y, si aplica, el detalle y el resumen.

---

## 4. Autenticación y sesión

- `authStore` (Zustand + persist) maneja `user`, `isAuthenticated`, `sessionExpiry`, `accessToken`, `refreshToken`.
- `api.js` inyecta `Authorization` y maneja el refresh con cola de peticiones.
- `ProtectedRoute` solo valida autenticación; **cada página debe validar el rol**.
- No dupliques lógica de refresh en componentes.
- No agregues nuevos secretos a `localStorage`.
- **Riesgo vigente:** access/refresh tokens persistidos en `localStorage`. No empeorar; si se propone migración, hacerla en un sprint dedicado con aprobación.
- Mantén `withCredentials: true` y la compatibilidad con cookies `httpOnly`.

---

## 5. Formularios y errores

- Usa `react-hook-form` + `zodResolver`.
- Define `defaultValues` completos para evitar inputs no controlados.
- En edición, `reset()` dentro de `useEffect` cuando lleguen los datos.
- Muestra errores de Zod en el input exacto (`errors.campo?.message`).
- Para errores del servidor:
  - muestra un toast con `error.response?.data?.message`;
  - si el backend devuelve `errors: [{ campo, mensaje }]`, mapea con `setError(campo, { message: mensaje })` (mejora pendiente).
- Deshabilita el botón mientras `isPending`/`isLoading`.
- Confirma acciones destructivas; el patrón actual es `window.confirm`. No lo cambies sin acuerdo.
- No uses `alert` para errores de validación.

---

## 6. UI y design system

- Usa tokens semánticos de Tailwind:
  - `bg-background`, `bg-surface`, `bg-surface-container-lowest`, `bg-surface-container`;
  - `text-on-surface`, `text-on-surface-variant`, `text-primary`, `text-error`;
  - `border-outline-variant/10`, `bg-primary-container/10`;
  - `p-lg`, `gap-gutter`, `gap-md`, `px-md`, `py-sm`;
  - `text-headline-lg`, `text-headline-md`, `text-body-md`, `text-label-lg`, `text-label-sm`.
- **No uses colores hex hardcodeados** en componentes nuevos. Excepciones existentes: `main.jsx` (Toaster) e `index.css`.
- Usa los componentes existentes (`Button`, `Input`, `Icon`, `Avatar`, `Pagination`, `ViewToggle`, `Logo`) antes de crear uno nuevo.
- Iconos con `Icon` (Material Symbols); no importes librerías de iconos.
- Respeta la estructura visual:
  - contenedor `space-y-lg animate-fade-in-up`;
  - breadcrumb;
  - card con header en gradiente;
  - grid responsive;
  - tablas con `overflow-x-auto`.
- Mantén accesibilidad: labels, `title` en botones icónicos, foco visible, contraste.
- No rompas los temas `default`, `emerald` y `matrix`.

---

## 7. Roles y navegación

- El sidebar define la navegación por rol, pero **no es seguridad**.
- Guardas por página (patrón actual):
  - Usuarios: `admin`, `JEFE_COMUNIDAD`.
  - Comunidades (lectura/resumen): `admin`, `JEFE_COMUNIDAD`; formulario solo `admin`.
  - Habitantes: los tres roles; creación/edición solo `admin`/`LIDER_CALLE`.
  - Carga masiva: `admin`.
  - Auditoría: `admin`.
- Si añades una ruta, registra la guarda de rol en la página o en un componente centralizado.
- No muestres acciones que el backend rechazará; pero recuerda que la protección real está en el backend.
- **Deuda:** centralizar las guardas en un `RoleRoute`/helper para evitar olvidos y efectos secundarios en render.

---

## 8. Rendimiento

- No pidas `limit` gigantes; usa paginación del backend cuando sea posible.
- `HabitantesPage` usa `limit=9999` para agrupar/exportar; es una deuda conocida. Si tocas esa vista, evalúa paginación server-side.
- Evita recalcular filtros costosos en cada render; usa `useMemo` cuando aporte claridad.
- No guardes en Zustand datos que TanStack Query ya cachea.
- Mantén `staleTime`/`gcTime` coherentes con la frecuencia de cambio.
- Evita re-renders innecesarios: selecciona solo el campo del store que necesitas (`useAuthStore((s) => s.user)`).

---

## 9. Seguridad frontend

- No pongas secretos en `VITE_*`: son públicos.
- No uses `dangerouslySetInnerHTML` con datos del usuario.
- No almacenes PII innecesaria en `localStorage`.
- No confíes en datos del cliente para permisos, cálculos críticos o scoping.
- Sanitiza/valida URLs y parámetros.
- No expongas tokens en logs, consola, URLs ni mensajes de error.
- **Riesgo vigente:** tokens en `localStorage`; ver §4.
- **Riesgo vigente:** cookies `sameSite: 'none'` en producción; si se usa autenticación por cookie, revisar CSRF con el backend.

---

## 10. Convenciones de código

- Componentes funcionales; sin class components.
- Un componente por archivo; páginas en `PascalCase`, hooks/services en `camelCase`.
- Imports relativos; el alias `@` existe pero el código usa relativos. Mantén el estilo del archivo.
- Comentarios y textos de UI en español.
- Evita `useEffect` para fetching; usa TanStack Query.
- Maneja estados de carga, error y vacío en cada vista.
- No dejes `console.log` de depuración.
- Respeta el estilo de comillas/punto y coma del archivo.

---

## 11. Post-vuelo obligatorio

- [ ] `pnpm build` en `frontend/` sin errores nuevos.
- [ ] Probar el flujo principal (crear/editar/listar/eliminar) si es posible.
- [ ] Verificar guardas de rol y navegación.
- [ ] Verificar responsive en móvil/escritorio.
- [ ] `grep` de regresiones: imports rotos, query keys, campos viejos.
- [ ] Actualizar [`documentacion/implementado_frontend.md`](../../documentacion/implementado_frontend.md).
- [ ] Actualizar [`PROJECT_CONTEXT.md`](../../PROJECT_CONTEXT.md) si cambió un flujo o módulo.
- [ ] Actualizar [`documentacion/riesgos_pendientes.md`](../../documentacion/riesgos_pendientes.md) si se detectó o resolvió un riesgo.
- [ ] Actualizar `MEMORY.md` si se cierra sprint o cambia una decisión.
- [ ] Presentar propuesta de commit en español.
- [ ] Comunicar riesgos de seguridad/rendimiento detectados.

---

## 12. Prohibiciones explícitas

- Llamar axios directamente desde páginas/componentes.
- Duplicar lógica de auth/refresh fuera de `api.js` y `authStore`.
- Guardar secretos o tokens adicionales en `localStorage`.
- Usar `dangerouslySetInnerHTML` con datos no confiables.
- Hardcodear colores hex en componentes nuevos.
- Ocultar una acción solo con CSS y asumir que eso protege el recurso.
- Introducir `npm`/`yarn` o mezclar gestores.
- Añadir dependencias sin justificación y aprobación.
- Cambiar contratos de API o nombres de campos desde el frontend sin coordinación con backend.
- Reformatear archivos completos por preferencia personal.
