import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let vite;
let publicApi;
let bombonaPublicaService;
let pagoBombonasSchema;
let comprimirComprobante;
let createIdempotencyKey;
let getBombonaErrorMessage;
let mapBombonaApiErrors;
let isPublicRoutePath;

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  publicApi = (await vite.ssrLoadModule('/src/services/publicApi.js')).default;
  bombonaPublicaService = (await vite.ssrLoadModule('/src/services/bombonaPublicaService.js')).bombonaPublicaService;
  pagoBombonasSchema = (await vite.ssrLoadModule('/src/validations/pagoBombonas.js')).pagoBombonasSchema;
  comprimirComprobante = (await vite.ssrLoadModule('/src/utils/bombonaImage.js')).comprimirComprobante;
  createIdempotencyKey = (await vite.ssrLoadModule('/src/utils/idempotencyKey.js')).createIdempotencyKey;
  ({ getBombonaErrorMessage, mapBombonaApiErrors } = await vite.ssrLoadModule('/src/utils/bombonaErrors.js'));
  ({ isPublicRoutePath } = await vite.ssrLoadModule('/src/utils/routeAccess.js'));
});

after(async () => {
  await vite?.close();
});

describe('Bombonas público — cliente y contrato', () => {
  it('consulta la jornada con ID codificado, sin Authorization y sin credenciales cross-origin', async (t) => {
    const previousAdapter = publicApi.defaults.adapter;
    t.after(() => { publicApi.defaults.adapter = previousAdapter; });
    let capturedConfig;
    publicApi.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: { viviendas: [] }, status: 200, statusText: 'OK', headers: {}, config };
    };

    await bombonaPublicaService.getJornadaActiva('id con espacio');

    assert.match(capturedConfig.url, /id%20con%20espacio/);
    assert.equal(capturedConfig.withCredentials, false);
    assert.equal(capturedConfig.headers.get('Authorization'), undefined);
    assert.notEqual(capturedConfig.headers.get('Content-Type'), 'application/json');
  });

  it('envía multipart con calle, casa, foto e Idempotency-Key; no envía precio ni total', async (t) => {
    const previousAdapter = publicApi.defaults.adapter;
    t.after(() => { publicApi.defaults.adapter = previousAdapter; });
    let capturedConfig;
    publicApi.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: { pago: { estado: 'pendiente' } }, status: 201, statusText: 'Created', headers: {}, config };
    };
    const comprobante = new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], 'comprobante.jpg', { type: 'image/jpeg' });

    await bombonaPublicaService.crearPago({
      comunidadId: '64f0c2a1b2c3d4e5f6071829',
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
      data: {
        calle: 'Principal',
        numeroCasa: '14',
        propietario: 'Ana Perez',
        referencia: 'ABC12345',
        bombonas: { grande: 1, mediana: 0, pequena: 1 },
        comprobante,
      },
    });

    const formData = capturedConfig.data;
    assert.equal(formData.get('calle'), 'Principal');
    assert.equal(formData.get('numeroCasa'), '14');
    assert.equal(formData.get('bombonasGrande'), '1');
    assert.equal(formData.get('bombonasPequena'), '1');
    assert.equal(formData.get('website'), '');
    assert.equal(formData.get('comprobante').type, 'image/jpeg');
    assert.equal(formData.get('total'), null);
    assert.equal(formData.get('precios'), null);
    assert.equal(capturedConfig.headers.get('Idempotency-Key'), '11111111-1111-4111-8111-111111111111');
    assert.equal(capturedConfig.withCredentials, false);
    assert.notEqual(capturedConfig.headers.get('Content-Type'), 'application/json');
  });

  it('valida calle+número, campos personales y cantidades permitidas por el formulario', () => {
    const comprobante = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'comprobante.jpg', { type: 'image/jpeg' });
    const valid = pagoBombonasSchema.safeParse({
      calle: 'Principal',
      numeroCasa: '14',
      propietario: 'Ana Perez',
      referencia: 'abc12345',
      comprobante,
      bombonas: { grande: 1, mediana: 0, pequena: 1 },
    });
    const missingStreet = pagoBombonasSchema.safeParse({
      calle: '',
      numeroCasa: '14',
      propietario: 'Ana Perez',
      referencia: 'ABC12345',
      comprobante,
      bombonas: { grande: 1, mediana: 0, pequena: 0 },
    });
    const noBombonas = pagoBombonasSchema.safeParse({
      calle: 'Principal',
      numeroCasa: '14',
      propietario: 'Ana Perez',
      referencia: 'ABC12345',
      comprobante,
      bombonas: { grande: 0, mediana: 0, pequena: 0 },
    });

    assert.equal(valid.success, true);
    assert.equal(valid.data.referencia, 'ABC12345');
    assert.equal(missingStreet.success, false);
    assert.equal(noBombonas.success, false);
  });

  it('crea UUID v4 para idempotencia', () => {
    assert.match(createIdempotencyKey(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('clasifica rutas públicas para omitir bootstrap de auth', () => {
    assert.equal(isPublicRoutePath('/publico/pago-bombonas/64f0c2a1b2c3d4e5f6071829'), true);
    assert.equal(isPublicRoutePath('/habitantes'), false);
  });

  it('mapea errores de casa al campo y códigos de referencia a mensajes seguros', () => {
    const mapped = [];
    mapBombonaApiErrors([{ campo: 'calle', mensaje: 'Seleccione una calle válida.' }], (field, value) => {
      mapped.push({ field, value });
    });
    assert.equal(mapped[0].field, 'calle');
    assert.equal(mapped[0].value.message, 'Seleccione una calle válida.');

    assert.match(getBombonaErrorMessage({ response: { data: { code: 'REFERENCIA_DUPLICADA' } } }), /referencia ya fue registrada/i);
  });
});

describe('Bombonas público — compresión local', () => {
  it('reduce resolución, convierte a JPEG y mantiene proporción', async (t) => {
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalDocument = globalThis.document;
    t.after(() => {
      if (originalCreateImageBitmap) globalThis.createImageBitmap = originalCreateImageBitmap;
      else delete globalThis.createImageBitmap;
      if (originalDocument) globalThis.document = originalDocument;
      else delete globalThis.document;
    });

    let dimensions;
    globalThis.createImageBitmap = async () => ({ width: 4000, height: 2000, close() {} });
    globalThis.document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillRect() {}, drawImage() {} }),
        toBlob(callback, type) {
          dimensions = { width: this.width, height: this.height, type };
          callback(new Blob([new Uint8Array(1024)], { type }));
        },
      }),
    };

    const pngBytes = new Uint8Array(4096);
    pngBytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const source = new File([pngBytes], 'origen.png', { type: 'image/png' });
    const result = await comprimirComprobante(source);

    assert.equal(dimensions.width, 1600);
    assert.equal(dimensions.height, 800);
    assert.equal(dimensions.type, 'image/jpeg');
    assert.equal(result.file.type, 'image/jpeg');
    assert.equal(result.optimized, true);
  });

  it('rechaza PDF y HEIC sin intentar reconocer el dispositivo', async () => {
    const pdf = new File(["%PDF-"], 'pago.pdf', { type: 'application/pdf' });
    const heic = new File(['heic'], 'pago.heic', { type: 'image/heic' });
    await assert.rejects(() => comprimirComprobante(pdf), (error) => error.code === 'INVALID_FILE_TYPE');
    await assert.rejects(() => comprimirComprobante(heic), (error) => error.code === 'INVALID_FILE_TYPE');
  });

  it('usa el original compatible cuando el navegador no puede comprimir y cabe en 5 MiB', async (t) => {
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    t.after(() => {
      if (originalCreateImageBitmap) globalThis.createImageBitmap = originalCreateImageBitmap;
      else delete globalThis.createImageBitmap;
    });
    globalThis.createImageBitmap = async () => { throw new Error('codec no disponible'); };
    const source = new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], 'archivo-personal.jpg', { type: 'image/jpeg' });

    const result = await comprimirComprobante(source);

    assert.equal(result.optimized, false);
    assert.equal(result.file.name, 'comprobante.jpg');
    assert.match(result.warning, /imagen original/i);
  });
});
