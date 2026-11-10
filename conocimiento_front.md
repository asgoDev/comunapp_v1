# Conocimiento Frontend — ComunApp v1

> **Memoria de largo plazo del frontend.** Registra decisiones, convenciones y trampas que un agente debe conocer antes de modificar la UI, los hooks, los formularios o la autenticación. El historial de cambios vive en [`documentacion/implementado_frontend.md`](./documentacion/implementado_frontend.md).
>
> Última revisión: 2026-11-09.

---

## 1. Identidad técnica

- **React 18** + **Vite 6**.
- **Tailwind CSS 3** con design tokens basados en variables CSS (`--color-*`).
- **TanStack Query v5** para estado del servidor.
- **Zustand 5** para estado global del cliente (`authStore`, `uiStore`).
- **react-hook-form 7 + Zod** para formularios.
- **axios** con interceptores de auth y refresh.
- **react-hot-toast** para feedback.
- **jsPDF + jspdf-autotable** para reportes PDF.
- **react-router-dom 6** para rutas.
- **pnpm** obligatorio.

### Estructura

```text
frontend/src/
├── components/
│   ├── layout/       # AppLayout, Sidebar, TopBar, ProtectedRoute
│   └── ui/           # Avatar, Button, Icon, Input, Logo, Pagination, ViewToggle
├── hooks/            # use*Queries.js (TanStack Query)
├── lib/              # queryClient
├── pages/            # Un directorio por módulo
├── services/         # axios por módulo
├── stores/           # authStore, uiStore (y stores deprecados)
├── utils/            # formatters, pdfExport, venezuela.json
├── validations/      # schemas Zod por módulo
├── App.jsx           # rutas
├── main.jsx          # providers
└── index.css         # temas, tokens y animaciones
```

---

## 2. Flujo de datos

```text
Componente / Page
  -> hook (useXQueries)
  -> service (axios)
  -> API /api/*
  -> TanStack Query cache
  -> render
```

- Los **services** solo definen llamadas axios y devuelven la promesa.
- Los **hooks** hacen `.then((res) => res.data)` y exponen `useQuery`/`useMutation`.
- Los **componentes** no llaman axios directamente.
- No dupliques lógica de fetching en componentes.

### Convención de query keys

| Recurso | Query key |
|---|---|
| Lista | `['<modulo>', 'list', { page, ...filters }]` |
| Detalle | `['<modulo>', 'detail', id]` |
| Dropdown | `['<modulo>', 'dropdown']` |
| Resumen | `['<modulo>', 'resumen', id]` |
| Dashboard | `['dashboard', 'stats']` |
| Perfil | `['profile']` |
| Auditoría | `['auditoria', 'logs', { page, ...filters }]` |

- Las mutaciones invalidan `['<modulo>']` y, cuando aplica, `['<modulo>', 'detail', id]` y `['<modulo>', 'resumen', id]`.
- `queryClient` global: `staleTime` 5 min, `gcTime` 10 min, `retry: 1`, `refetchOnWindowFocus: false`.
- Los dropdowns pueden usar `staleTime` mayor (ej. 30 min).

---

## 3. Autenticación y sesión

- `authStore` (Zustand, **sin persist**) mantiene en memoria `user`, `isAuthenticated`, `accessToken`, `isInitializing`, `isInitialized` y `sessionNotice`.
- El refresh token nunca llega a JavaScript: viaja solo en la cookie `HttpOnly` del backend.
- Si queda una entrada heredada `auth-storage` en `localStorage`, se elimina al cargar el store.
- `initializeAuth` se ejecuta una vez al arrancar y deduplica el doble montaje de React StrictMode:
  1. Llama a `/auth/refresh` usando la cookie.
  2. Guarda el access token solo en memoria.
  3. Consulta `/auth/me`.
  4. Si falla, limpia la sesión y muestra login.
- `checkAuth` consulta `/auth/me` cada 5 minutos y al recuperar foco; no extiende la sesión artificialmente.
- `api.js` inyecta `Authorization: Bearer <accessToken>` desde Zustand, sin fallback a `localStorage`.
- Ante `401`, el interceptor:
  - Evita reintentar en `/auth/login`, `/auth/refresh` y `/auth/logout`.
  - Comparte una única promesa de refresh entre peticiones concurrentes.
  - Llama a `/auth/refresh` sin body: el token viaja por cookie.
  - Reintenta la petición original con el nuevo access token.
  - Si falla, limpia auth y caché de TanStack Query y muestra un aviso genérico de sesión expirada.
- Logout limpia estado, caché y cookies; no vuelve a persistir tokens.

### Fallback iOS

- Si frontend y API están en sitios distintos, WebKit puede bloquear la cookie de refresh.
- Al expirar el access token o recargar la página, el refresh falla y se solicita login nuevamente.
- El access token se conserva solo en memoria mientras la pestaña sigue abierta.
- **No** se detecta iOS por `userAgent` ni se reintroduce el refresh en body/localStorage. El comportamiento depende de la capacidad real de la cookie.

### `ProtectedRoute`

- Solo verifica `isAuthenticated`.
- **No** verifica rol. Cada página debe comprobar `user.role` y redirigir si no corresponde.
- Las rutas reales están en `App.jsx`; el sidebar solo oculta enlaces, no protege la URL.

---

## 4. Formularios y validación

Patrón estándar:

```jsx
const { register, handleSubmit, reset, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

- Schemas en `src/validations/<modulo>.js`.
- `Input` muestra label, ícono, error en rojo y toggle de contraseña.
- Los errores de Zod se muestran campo por campo.
- Los errores del servidor se muestran con `toast.error(error.response?.data?.message || '...')`.
- **Mejora pendiente:** cuando el backend devuelva `errors: [{ campo, mensaje }]`, mapear cada `campo` al input exacto con `setError(campo, { message })`; hoy solo se muestra el toast.
- En edición, cargar datos con `reset()` dentro de `useEffect` cuando llegue la query.
- Los formularios de creación/edición de usuarios incluyen lógica condicional:
  - `JEFE_COMUNIDAD` y `LIDER_CALLE` requieren `comunidad`.
  - `LIDER_CALLE` requiere `calle`.
  - `JEFE_COMUNIDAD` solo puede crear/editar `LIDER_CALLE` de su comunidad (la UI y el backend lo refuerzan).
- `HabitanteFormPage` permite a `LIDER_CALLE` crear/editar; `JEFE_COMUNIDAD` solo lectura.
- La validación del frontend es UX; la autorización y la validación reales están en el backend.

---

## 5. Design system y UI

### Tokens

- Colores semánticos: `bg-background`, `bg-surface`, `bg-surface-container-lowest`, `text-on-surface`, `text-on-surface-variant`, `text-primary`, `border-outline-variant/10`, `bg-error/10`, etc.
- Tipografía: `font-montserrat`, `text-headline-lg`, `text-headline-md`, `text-body-md`, `text-label-lg`, `text-label-sm`.
- Espaciado: `p-lg`, `gap-gutter`, `gap-md`, `px-md`, `py-sm`, etc.
- Radios: `rounded-lg`, `rounded-xl`, `rounded-full`.
- **No uses colores hex hardcodeados** en componentes; usa los tokens. Las excepciones existentes están en `main.jsx` (estilos del Toaster) y `index.css`.

### Temas

- `uiStore` persiste `theme` y lo aplica en `document.documentElement[data-theme]`.
- Temas: `default`, `emerald`, `matrix`.
- `matrix` añade efectos neón vía CSS.
- No dupliques variables de color en componentes.

### Componentes UI

- `Button`: variantes `primary`, `secondary`, `outline`, `ghost`, `danger`; tamaños `sm`, `md`, `lg`; `loading`.
- `Input`: label, icono, error, password toggle.
- `Icon`: Material Symbols (`material-symbols-outlined`), prop `filled`.
- `Avatar`, `Logo`, `Pagination`, `ViewToggle`.
- Layout: sidebar fijo/colapsable, topbar sticky, contenido con `overflow-y-auto`.

### Patrones de página

- Contenedor `space-y-lg animate-fade-in-up`.
- Breadcrumb con `Icon name="arrow_back"`.
- Card principal con header en gradiente `from-primary to-primary-container`.
- Formularios en grid `grid-cols-1 md:grid-cols-2 gap-lg`.
- Tablas con `overflow-x-auto`, encabezados en `bg-surface-container`, filas hover.
- Cards de estadísticas con ícono, label, valor y trend.
- Confirmaciones destructivas con `window.confirm` (patrón existente; no migrar sin acuerdo).
- Feedback con `react-hot-toast` (success/error).

### Accesibilidad y responsive

- Mantener labels visibles, `title` en botones icónicos y contraste de tokens.
- El sidebar se colapsa en móvil con overlay.
- Evitar `div` clicables sin rol/teclado; usar `button` cuando corresponda.

---

## 6. Roles, navegación y guardas

- Sidebar (`Sidebar.jsx`) define la navegación con `roles`:
  - Dashboard: los tres roles.
  - Comunidades: `admin`, `JEFE_COMUNIDAD`.
  - Habitantes: los tres roles.
  - Carga Masiva: `admin`.
  - Usuarios: `admin`, `JEFE_COMUNIDAD`.
  - Auditoría: `admin`.
- Para `JEFE_COMUNIDAD`, “Comunidades” se transforma en “Mi Comunidad” y apunta a `/comunidades/:id/resumen`; “Usuarios” se transforma en “Líderes de Calle”.
- Las páginas hacen guardas adicionales:
  - `UsersPage`, `UserFormPage`: `admin` / `JEFE_COMUNIDAD`.
  - `ComunidadesPage`, `ComunidadFormPage`, `ComunidadResumenPage`: `admin` / `JEFE_COMUNIDAD` (formulario solo admin).
  - `HabitantesBulkPage`: solo admin.
  - `AuditoriaPage`: solo admin.
- **Deuda:** las guardas están duplicadas y algunas se evalúan durante el render (incluido `toast.error`). Centralizar en un componente `RoleRoute` o helper reduce el riesgo de olvidar una protección.
- **Regla:** nunca confíes en ocultar un botón como control de acceso; el backend debe rechazar la operación.

---

## 7. Módulos y páginas

| Módulo | Páginas / componentes | Notas |
|---|---|---|
| Login | `Login/LoginPage.jsx` | Formulario RHF+Zod; acepta cédula, email o solo números (antepone `V-`). |
| Dashboard | `Dashboard/DashboardPage.jsx` | Métricas y acciones rápidas por rol. |
| Comunidades | `Comunidades/ComunidadesPage.jsx`, `ComunidadFormPage.jsx`, `ComunidadResumenPage.jsx` | CRUD; selects de estado/municipio/parroquia desde `venezuela.json`; resumen con conteos. |
| Habitantes | `Habitantes/HabitantesPage.jsx`, `HabitanteFormPage.jsx`, `HabitanteDetailPage.jsx`, `CasaDetailPage.jsx`, `HabitantesBulkPage.jsx` | Vista casas/listado, agrupación por calle/casa, carga masiva y PDF. |
| Usuarios | `Users/UsersPage.jsx`, `UserFormPage.jsx` | CRUD con roles y asignación territorial. |
| Auditoría | `Auditoria/AuditoriaPage.jsx` | Filtros por módulo/acción/resultado/fechas; solo admin. |
| Perfil | `Profile/ProfilePage.jsx` | Edición de datos y cambio de contraseña. |
| Bombonas pública | `Publico/PagoBombonasPage.jsx` | Consulta jornada pública, selección calle/casa, compresión JPG/PNG y envío idempotente sin sesión. |

### Habitantes: decisiones específicas

- `HabitantesPage` pide `limit=9999` y pagina localmente para poder agrupar por casa y exportar el listado completo. **Deuda de rendimiento:** con muchas comunidades/registros, migrar a paginación server-side y exportación por tramos.
- Agrupación por `` `${calle}|||${numeroCasa}` ``.
- `CasaDetailPage` muestra los habitantes de una casa.
- `HabitantesBulkPage` envía `{ habitantes: [...] }` a `/habitantes/bulk`; el backend responde `201` o `207`.
- El PDF se genera con `pdfExport.js`; incluye encabezado institucional, datos geográficos y tabla.

### Formateo

- `formatBirthDate`: fecha `DD/MM/AAAA` en UTC.
- `calculateAge`: edad a partir de fecha de nacimiento.
- `formatName`: **rota** (usa `String.prototype.capitalize`, que no existe) y no tiene consumidores. No usarla; si se necesita, implementarla correctamente.
- Para nombres, la UI usa la clase CSS `capitalize` sobre los datos normalizados en minúsculas.

---

## 8. Rendimiento y estado

- No abuses de `staleTime` alto si los datos cambian con frecuencia; los valores actuales son razonables para este dominio.
- Evita `limit` gigantes; prefiere paginación del backend.
- No guardes datos derivados en Zustand si TanStack Query ya los provee.
- `ReactQueryDevtools` está habilitado en desarrollo.
- `authStore` no persiste estado: los datos de sesión viven en memoria y se restauran con la cookie de refresh.
- Los stores `userStore`, `comunidadStore`, `habitanteStore` y `auditoriaStore` son stubs deprecados (`export {}`); eliminar cuando se confirme que no hay imports.

---

## 9. Seguridad frontend

- No pongas secretos en variables `VITE_*`: son públicas por diseño.
- No uses `dangerouslySetInnerHTML` con datos del usuario.
- No construyas URLs con input sin `encodeURIComponent` cuando corresponda.
- No almacenes PII innecesaria en `localStorage`.
- Mantén `withCredentials: true` en el cliente autenticado `api.js`; el cliente `publicApi.js` no incluye Authorization ni activa credenciales cross-origin y solo llama rutas que no autentican por cookie.
- Si se añade un flujo de pago, archivos o datos sensibles, consultar antes de elegir almacenamiento.
- El formulario público de Bombonas usa `services/publicApi.js`, cliente aislado del `api.js` autenticado; no envía `Authorization`, no reintenta refresh y no persiste PII/token. La subida va al backend, nunca directamente a Cloudinary.
- Comprobantes: frontend rechaza PDF/HEIC, optimiza JPG/PNG con Canvas usando calidad configurable y máximo 5 MiB de salida. Esto es UX/performance: firma, MIME, size, total y disponibilidad se validan siempre en backend.
- Las URLs de pagos firmadas que devuelve el backend son temporales; no guardarlas en estado persistente ni `localStorage`.
- La página pública evita `initializeAuth`/`checkAuth` en `/publico/*`; no marcar `authStore` inicializado al saltar el bootstrap, para que una navegación posterior a rutas privadas todavía pueda restaurar sesión.
- El cliente público conserva `Idempotency-Key` en memoria mientras se reintenta el mismo payload. Cambiar el payload crea otra clave; no reintentar automáticamente el POST.
- `bombonaImage.js` valida firma básica JPG/PNG, rechaza HEIC/PDF, aplica límites frontend y redimensiona/re-encodea en JPEG. El archivo y la vista previa solo viven en memoria/object URL; liberar URLs al cambiar/remover/desmontar. El backend mantiene todos los controles autoritativos.
- Calidad y lado máximo se configuran con `VITE_BOMBONAS_IMAGE_QUALITY` y `VITE_BOMBONAS_IMAGE_MAX_SIDE`; son configuración pública, nunca secretos.
- **R-03 resuelto:** access token solo en memoria y refresh solo por cookie `HttpOnly`; no reintroducir persistencia de tokens.
- **Riesgo vigente:** `window.confirm` y mensajes de error genéricos; no exponen datos, pero no sustituyen validación/errores de campo.

---

## 10. Convenciones de código

- Componentes funcionales y hooks; no class components.
- Nombres de archivos de páginas en `PascalCase` (`HabitantesPage.jsx`); hooks en `camelCase` (`useHabitanteQueries.js`); servicios en `camelCase` (`habitanteService.js`).
- Imports relativos; alias `@` existe en Vite pero el código usa rutas relativas. Mantén el estilo del archivo.
- Comentarios y textos de UI en español.
- Un componente por archivo; helpers puros en `utils/`.
- Evita `useEffect` para datos que TanStack Query puede manejar.
- Usa `useAuthStore((s) => s.user)` en lugar de desestructurar el store completo cuando solo necesitas un campo (evita re-renders innecesarios). Algunos archivos existentes desestructuran; no es obligatorio refactorizar todo.
- Mantén el estilo de comillas del archivo (el repo mezcla simples y dobles).

---

## 11. Comandos y verificación

```bash
cd frontend
pnpm install
pnpm dev
pnpm build
pnpm preview
```

- `pnpm test` usa `node:test` + Vite SSR para probar store e interceptor sin dependencias nuevas.
- No hay ESLint/Prettier configurado.
- Verificación mínima tras un cambio: `pnpm test` y `pnpm build` sin errores nuevos.
- Si se toca lógica de formateo/fechas, probar manualmente o ampliar la suite.
- Si se toca auth, probar login, refresh, expiración, logout, concurrencia y ausencia de tokens persistidos.

---

## 12. Deudas y trampas conocidas

> Registro priorizado, impacto y plan de remediación: [`documentacion/riesgos_pendientes.md`](./documentacion/riesgos_pendientes.md).

1. **`ProtectedRoute` no valida roles**; guardas duplicadas en páginas. R-07.
2. **`toast.error` durante el render** en varias guardas de página (efecto secundario en render). R-07.
3. **`HabitantesPage` con `limit=9999`** y paginación local. R-09.
4. **`formatName` rota** y sin uso. R-14.
5. **Stores deprecados** que conviene eliminar. R-14.
6. **Errores de servidor** no se mapean a inputs; solo toast. R-17.
7. **`main.jsx`** usa colores hex en el Toaster en lugar de tokens (deuda menor).
8. **`ComunidadFormPage`** usa `venezuela.json`; si se actualiza la división político-territorial, verificar el formato.
9. **Cobertura de tests acotada** a auth; faltan componentes, hooks, formatters y lint. R-08.
10. **No hay manejo centralizado de errores de red**; cada página decide el toast.
11. **Documentación base:** `README.md` fue reescrito y sincronizado el 2026-11-04. Resuelto (R-21).
12. **Bombonas pública:** backend implementado; formulario ya conectado, pero necesita variables Cloudinary en el backend para que el registro real finalice. Ver R-24/R-30.

---

## 13. Checklist para añadir/modificar una pantalla frontend

- [ ] ¿Pertenece al módulo del sprint actual?
- [ ] ¿La ruta está registrada en `App.jsx`?
- [ ] ¿La página valida el rol del usuario (no solo el sidebar)?
- [ ] ¿Usa un hook de TanStack Query y un service, sin axios directo?
- [ ] ¿La query key sigue la convención y las mutaciones invalidan lo correcto?
- [ ] ¿El formulario usa RHF + Zod y muestra errores por campo?
- [ ] ¿Se usan tokens de diseño (colores, tipografía, spacing) y no hex sueltos?
- [ ] ¿Es responsive y accesible?
- [ ] ¿No se añadieron secretos ni PII a `localStorage`?
- [ ] ¿Se verificó con `pnpm build`?
- [ ] ¿Se actualizó `documentacion/implementado_frontend.md`?
- [ ] ¿Se comunicaron riesgos de seguridad o de rendimiento?

---

## 14. Preferencias del propietario (no negociables)

- Seguridad primero; nunca atajos inseguros.
- Validación Zod y mensajes claros en español.
- UI consistente con los tokens y el diseño existente.
- Formularios con `react-hook-form` + Zod; errores visibles en el campo exacto.
- Datos del servidor con TanStack Query; estado global mínimo en Zustand.
- No duplicar resúmenes en el chat; remitir a la documentación.
- Cambios mínimos y enfocados en un módulo.
- `pnpm` siempre.
- Avisar de cualquier riesgo de seguridad de inmediato.
