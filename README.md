# Plantilla Login & Usuarios (SIGAS Template)

Base full-stack con **autenticación JWT**, **CRUD de usuarios** (roles `admin` / `user`) y **auditoría** de acciones.

## Características

- Autenticación: login, registro (si está habilitado en rutas), refresh tokens
- CRUD de usuarios protegido por rol `admin`
- Dashboard con métricas básicas (usuarios, activos, eventos de auditoría)
- Layout responsivo con sidebar colapsable
- Rutas públicas y privadas
- Validaciones Zod (frontend y backend)
- Estado con Zustand (`authStore`, `userStore`, `uiStore`)
- Seguridad: Helmet, rate-limit, mongo-sanitize, cookies httpOnly

## Stack

| Capa | Tecnologías |
|------|-------------|
| Backend | Node.js (ESM) + Express 4 + Mongoose 8 + Zod |
| Frontend | React 18 + Vite + Tailwind CSS + Zustand |
| Base de datos | MongoDB |
| Auth | JWT (access + refresh) + bcrypt |

## Estructura

```
├── backend/
│   ├── config/
│   ├── models/          (User, Auditoria)
│   ├── routes/          (auth, users, dashboard)
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   ├── validations/
│   └── server.js
├── frontend/
│   └── src/
│       ├── pages/       (Login, Dashboard, Users)
│       ├── stores/
│       ├── services/
│       ├── components/
│       └── validations/
└── README.md
```

## Inicio rápido

### Backend

```bash
cd backend
cp .env.example .env   # configurar MONGO_URI, JWT secrets, FRONTEND_URL
pnpm install
pnpm run seed          # primer usuario admin
pnpm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL apuntando al backend
pnpm install
pnpm run dev
```

## API relevante

- `GET /api/health` — estado del servidor
- `POST /api/auth/login` — inicio de sesión
- `GET /api/dashboard/stats` — métricas del dashboard (autenticado)
- `CRUD /api/users` — solo rol `admin`
