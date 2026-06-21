import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './infrastructure/database/db.js';

// ── Middleware ──
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { apiLimiter } from './shared/middleware/security.middleware.js';
import auditMiddleware from './shared/middleware/audit.middleware.js';
import errorHandler from './shared/middleware/errorHandler.js';

// ── Rutas ──
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import comunidadRoutes from './modules/comunidades/comunidad.routes.js';
import habitanteRoutes from './modules/habitantes/habitante.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import auditoriaRoutes from './modules/auditoria/auditoria.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';

// ── Configuración ──
const app = express();
app.set('trust proxy', 1); // Confiar en el reverse proxy de Render para express-rate-limit

const PORT = process.env.PORT || 3000;

// ══════════════════════════════════════════════════
//  MIDDLEWARE GLOBAL
// ══════════════════════════════════════════════════

app.use(helmet()); // Cabeceras de seguridad HTTP
app.use(mongoSanitize()); // Prevenir inyecciones NoSQL

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // Permitir cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200 // Compatibilidad con navegadores antiguos y móviles
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Limitar tasa de peticiones en toda la API
app.use('/api', apiLimiter);

// Middleware de auditoría global (POST, PUT, DELETE)
app.use(auditMiddleware);

// ══════════════════════════════════════════════════
//  RUTAS
// ══════════════════════════════════════════════════

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comunidades', comunidadRoutes);
app.use('/api/habitantes', habitanteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/profile', profileRoutes);

// ── Ruta no encontrada ──
app.use((_req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada.' });
});

// ── Manejador de errores centralizado ──
app.use(errorHandler);

// ══════════════════════════════════════════════════
//  INICIAR SERVIDOR
// ══════════════════════════════════════════════════

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
};

startServer();
