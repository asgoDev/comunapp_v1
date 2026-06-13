/**
 * validate(schema)
 *
 * Middleware de validación genérico. Recibe un schema Zod, valida req.body
 * y llama a next() si pasa o next(error) si falla.
 *
 * Al colocarlo en la ruta antes del controlador, el servicio recibe datos
 * ya garantizados — no necesita .parse() interno ni manejar ZodError.
 *
 * @example
 *   import { loginSchema } from '../validations/auth.js';
 *   router.post('/login', validate(loginSchema), authController.login);
 */
const validate = (schema) => (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return next(result.error); // ZodError — lo captura errorHandler
    }
    req.body = result.data; // datos coercionados y saneados por Zod
    next();
};

export default validate;
