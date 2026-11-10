import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let vite;
let api;
let useAuthStore;
let bombonaAdminService;
let buildCreateJornadaPayload;
let buildPagosQueryParams;
let buildPublicJornadaUrl;
let shouldResetPage;
let ESTADO_PAGO;
let crearJornadaSchema;
let rechazarPagoSchema;

const COMUNIDAD_ID = '64f0c2a1b2c3d4e5f6071829';
const JORNADA_ID = '64f0c2a1b2c3d4e5f6071840';

const resetAuth = () => {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    accessToken: null,
  });
};

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  const serviceModule = await vite.ssrLoadModule('/src/services/bombonaAdminService.js');
  const apiModule = await vite.ssrLoadModule('/src/services/api.js');
  const storeModule = await vite.ssrLoadModule('/src/stores/authStore.js');
  const utilsModule = await vite.ssrLoadModule('/src/utils/bombonaAdmin.js');
  const validationsModule = await vite.ssrLoadModule('/src/validations/bombonaAdmin.js');

  bombonaAdminService = serviceModule.bombonaAdminService;
  api = apiModule.default;
  useAuthStore = storeModule.useAuthStore;
  ({
    buildCreateJornadaPayload,
    buildPagosQueryParams,
    buildPublicJornadaUrl,
    shouldResetPage,
    ESTADO_PAGO,
  } = utilsModule);
  ({ crearJornadaSchema, rechazarPagoSchema } = validationsModule);
});

after(async () => {
  await vite?.close();
});

describe('Bombonas administrativas — helpers puros', () => {
  it('incluye la comunidad solo cuando el rol es admin', () => {
    const values = {
      comunidad: COMUNIDAD_ID,
      precios: { grande: 250.5, mediana: 180, pequena: 120 },
      pagoMovil: {
        banco: 'Banesco',
        telefono: '0414-1234567',
        documento: 'V-12345678',
        titular: 'Ana Perez',
      },
    };

    const adminPayload = buildCreateJornadaPayload(values, { role: 'admin' });
    const jefePayload = buildCreateJornadaPayload(values, { role: 'JEFE_COMUNIDAD' });

    assert.equal(adminPayload.comunidad, COMUNIDAD_ID);
    assert.equal('comunidad' in jefePayload, false);
    assert.deepEqual(adminPayload.precios, { grande: 250.5, mediana: 180, pequena: 120 });
    assert.equal(adminPayload.pagoMovil.banco, 'Banesco');
  });

  it('omite filtros vacíos y conserva jornada, página y límite', () => {
    const minimal = buildPagosQueryParams({ jornadaId: JORNADA_ID, page: 2 });
    const complete = buildPagosQueryParams({
      jornadaId: JORNADA_ID,
      estado: 'pendiente',
      calle: 'Calle 2',
      search: '  ABC123  ',
      page: 3,
      limit: 10,
    });

    assert.deepEqual(minimal, { page: 2, limit: 20, jornadaId: JORNADA_ID });
    assert.deepEqual(complete, {
      page: 3,
      limit: 10,
      jornadaId: JORNADA_ID,
      estado: 'pendiente',
      calle: 'Calle 2',
      search: 'ABC123',
    });
  });

  it('resetea la página ante filtros o jornada, pero no ante cambio solo de página', () => {
    const base = { estado: '', calle: '', jornadaId: JORNADA_ID };

    assert.equal(shouldResetPage(base, { ...base, estado: 'pendiente' }), true);
    assert.equal(shouldResetPage(base, { ...base, calle: 'Calle 2' }), true);
    assert.equal(shouldResetPage(base, { ...base, jornadaId: 'otra' }), true);
    assert.equal(shouldResetPage({ ...base, page: 1 }, { ...base, page: 2 }), false);
  });

  it('construye la URL pública con el origen actual', () => {
    const originalWindow = globalThis.window;
    globalThis.window = { location: { origin: 'https://comunapp.test' } };
    try {
      assert.equal(
        buildPublicJornadaUrl(COMUNIDAD_ID),
        `https://comunapp.test/publico/pago-bombonas/${COMUNIDAD_ID}`,
      );
    } finally {
      if (originalWindow) globalThis.window = originalWindow;
      else delete globalThis.window;
    }
  });

  it('expone exactamente los estados Pendiente, Verificado y Rechazado', () => {
    assert.deepEqual(Object.keys(ESTADO_PAGO).sort(), ['pendiente', 'rechazado', 'verificado']);
    assert.equal(ESTADO_PAGO.pendiente.label, 'Pendiente');
    assert.equal(ESTADO_PAGO.verificado.label, 'Verificado');
    assert.equal(ESTADO_PAGO.rechazado.label, 'Rechazado');
    assert.equal(
      Object.values(ESTADO_PAGO).some((estado) => /aprobado/i.test(estado.label)),
      false,
    );
  });
});

describe('Bombonas administrativas — servicio autenticado', () => {
  it('consulta las calles de la jornada con el endpoint y parámetro correctos', async (t) => {
    resetAuth();
    const previousAdapter = api.defaults.adapter;
    t.after(() => { api.defaults.adapter = previousAdapter; });
    let capturedConfig;
    api.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: { calles: [] }, status: 200, statusText: 'OK', headers: {}, config };
    };

    await bombonaAdminService.listCalles({ jornadaId: JORNADA_ID });

    assert.equal(capturedConfig.url, '/bombonas/pagos/calles');
    assert.equal(capturedConfig.method, 'get');
    assert.deepEqual(capturedConfig.params, { jornadaId: JORNADA_ID });
  });

  it('envía el filtro de calle al listado de pagos', async (t) => {
    resetAuth();
    const previousAdapter = api.defaults.adapter;
    t.after(() => { api.defaults.adapter = previousAdapter; });
    let capturedConfig;
    api.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: { pagos: [] }, status: 200, statusText: 'OK', headers: {}, config };
    };

    await bombonaAdminService.listPagos({
      page: 1,
      limit: 20,
      jornadaId: JORNADA_ID,
      calle: 'Calle 2',
      estado: 'pendiente',
    });

    assert.equal(capturedConfig.url, '/bombonas/pagos');
    assert.equal(capturedConfig.params.calle, 'Calle 2');
    assert.equal(capturedConfig.params.estado, 'pendiente');
  });

  it('usa el cliente autenticado e inyecta el access token en memoria', async (t) => {
    resetAuth();
    useAuthStore.setState({ accessToken: 'token-admin' });
    t.after(() => resetAuth());
    const previousAdapter = api.defaults.adapter;
    t.after(() => { api.defaults.adapter = previousAdapter; });
    let capturedConfig;
    api.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: { jornadas: [] }, status: 200, statusText: 'OK', headers: {}, config };
    };

    await bombonaAdminService.listJornadas({ page: 1 });

    const authorization =
      capturedConfig.headers?.Authorization || capturedConfig.headers?.get?.('Authorization');
    assert.equal(authorization, 'Bearer token-admin');
    assert.equal(capturedConfig.withCredentials, true);
  });
});

describe('Bombonas administrativas — validaciones de formulario', () => {
  const pagoMovilValido = {
    banco: 'Banesco',
    telefono: '0414-1234567',
    documento: 'v-12345678',
    titular: 'Ana Perez',
  };

  it('acepta una jornada válida y normaliza el documento a mayúsculas', () => {
    const result = crearJornadaSchema.safeParse({
      precios: { grande: 250.5, mediana: 180, pequena: 120 },
      pagoMovil: pagoMovilValido,
    });

    assert.equal(result.success, true);
    assert.equal(result.data.pagoMovil.documento, 'V-12345678');
  });

  it('rechaza precios con tres decimales, teléfono mal formado y documento inválido', () => {
    const tresDecimales = crearJornadaSchema.safeParse({
      precios: { grande: 1.234, mediana: 180, pequena: 120 },
      pagoMovil: pagoMovilValido,
    });
    const telefonoInvalido = crearJornadaSchema.safeParse({
      precios: { grande: 250, mediana: 180, pequena: 120 },
      pagoMovil: { ...pagoMovilValido, telefono: '0414-123' },
    });
    const documentoInvalido = crearJornadaSchema.safeParse({
      precios: { grande: 250, mediana: 180, pequena: 120 },
      pagoMovil: { ...pagoMovilValido, documento: '12345678' },
    });

    assert.equal(tresDecimales.success, false);
    assert.equal(telefonoInvalido.success, false);
    assert.equal(documentoInvalido.success, false);
  });

  it('exige un motivo de rechazo de al menos 5 caracteres', () => {
    assert.equal(rechazarPagoSchema.safeParse({ motivoRechazo: 'mal' }).success, false);
    assert.equal(
      rechazarPagoSchema.safeParse({ motivoRechazo: 'Referencia ajena' }).success,
      true,
    );
  });
});
