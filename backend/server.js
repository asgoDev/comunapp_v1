import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';

// ── Middleware ──
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { apiLimiter } from './middleware/security.middleware.js';
import auditMiddleware from './middleware/audit.middleware.js';
import errorHandler from './middleware/errorHandler.js';

// ── Rutas ──
import authRoutes from './routes/AuthRoutes.js';
import userRoutes from './routes/UserRoutes.js';
import dashboardRoutes from './routes/DashboardRoutes.js';

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
app.use('/api/dashboard', dashboardRoutes);

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
