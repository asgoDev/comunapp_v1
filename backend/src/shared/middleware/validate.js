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
const validate = (schema, source = 'body') => (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
        return next(result.error); // ZodError — lo captura errorHandler
    }
    if (source === 'query') {
        // Express expone req.query como getter; conservar el resultado parseado aparte.
        req.validatedQuery = result.data;
    } else if (source === 'params') {
        req.validatedParams = result.data;
    } else {
        req[source] = result.data; // datos coercionados y saneados por Zod
    }
    next();
};

export default validate;
