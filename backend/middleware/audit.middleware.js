import auditoriaService from '../services/AuditoriaService.js';

/**
 * Mapa de método HTTP → acción de auditoría
 */
const METHOD_ACTION_MAP = {
  POST: 'CREAR',
  PUT: 'ACTUALIZAR',
  PATCH: 'ACTUALIZAR',
  DELETE: 'ELIMINAR',
};

/**
 * Extrae el módulo a partir de la ruta del request.
 * Ejemplo: /api/users/123 → "users"
 */
const extractModule = (path) => {
  const segments = path.split('/').filter(Boolean);
  const apiIndex = segments.indexOf('api');
  return apiIndex !== -1 && segments[apiIndex + 1]
    ? segments[apiIndex + 1].toUpperCase()
    : 'GENERAL';
};

/**
 * Middleware global de auditoría.
 * Registra en la base de datos cada operación POST, PUT, PATCH y DELETE.
 * Captura tanto respuestas exitosas (2xx) como fallidas (4xx/5xx).
 *
 * Para rutas sin autenticación (ej: login), el controlador puede inyectar
 * `req.auditUserId` manualmente para que se registre el usuario.
 */
const auditMiddleware = (req, res, next) => {
  const action = METHOD_ACTION_MAP[req.method];

  // Solo auditar métodos de escritura
  if (!action) return next();

  // Interceptamos res.json para capturar la respuesta
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Determinar el ID del usuario (autenticado o inyectado por el controlador)
    const userId = req.user?.id || req.auditUserId || null;

    // Registrar si hay un usuario identificado O si es una ruta de auth (login)
    const isAuthRoute = req.originalUrl.includes('/api/auth');
    const shouldAudit = userId || isAuthRoute;

    if (shouldAudit) {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

      auditoriaService.create({
        usuario_id: userId,
        accion: action,
        modulo: extractModule(req.originalUrl),
        detalles: {
          url: req.originalUrl,
          metodo: req.method,
          statusCode: res.statusCode,
          resultado: isSuccess ? 'EXITOSO' : 'FALLIDO',
          body: sanitizeBody(req.body),
          respuesta: typeof body === 'object'
            ? { message: body.message, id: body._id || body.id || body.user?.id }
            : undefined,
          ip: req.ip || req.connection?.remoteAddress,
        },
      }).catch((err) => {
        console.error('⚠️ Error al registrar auditoría:', err.message);
      });
    }

    return originalJson(body);
  };

  next();
};

/**
 * Elimina campos sensibles del body antes de guardar en auditoría
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'confirmPassword', 'accessToken', 'refreshToken'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) sanitized[field] = '[PROTEGIDO]';
  }
  return sanitized;
};

export default auditMiddleware;

