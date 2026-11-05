import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const storage = {
  removed: [],
  writes: 0,
  getItem: () => null,
  setItem: () => {
    storage.writes += 1;
  },
  removeItem: (key) => {
    storage.removed.push(key);
  },
};

globalThis.localStorage = storage;

let vite;
let useAuthStore;
let authService;
let api;
let queryClient;

const resetState = () => {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isCheckingAuth: false,
    isInitializing: true,
    isInitialized: false,
    accessToken: null,
    sessionNotice: null,
  });
  queryClient.clear();
};

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  const storeModule = await vite.ssrLoadModule('/src/stores/authStore.js');
  const serviceModule = await vite.ssrLoadModule('/src/services/authService.js');
  const apiModule = await vite.ssrLoadModule('/src/services/api.js');
  const queryModule = await vite.ssrLoadModule('/src/lib/queryClient.js');

  useAuthStore = storeModule.useAuthStore;
  authService = serviceModule.authService;
  api = apiModule.default;
  queryClient = queryModule.queryClient;
});

after(async () => {
  await vite?.close();
});

describe('authStore — sesión en memoria (R-03)', () => {
  it('elimina la sesión heredada de localStorage al cargar', () => {
    assert.ok(storage.removed.includes('auth-storage'));
  });

  it('login guarda solo el access token en memoria y no escribe almacenamiento', async (t) => {
    resetState();
    t.mock.method(authService, 'login', async () => ({
      data: {
        user: { id: 'user-1', role: 'LIDER_CALLE' },
        accessToken: 'access-en-memoria',
      },
    }));

    await useAuthStore.getState().login('user@example.com', 'secreto');

    const state = useAuthStore.getState();
    assert.equal(state.isAuthenticated, true);
    assert.equal(state.accessToken, 'access-en-memoria');
    assert.equal(state.user.id, 'user-1');
    assert.equal('refreshToken' in state, false);
    assert.equal(storage.writes, 0);
  });

  it('restaura la sesión con refresh por cookie y luego consulta /me', async (t) => {
    resetState();
    const refresh = t.mock.method(authService, 'refresh', async () => ({
      data: { accessToken: 'access-renovado' },
    }));
    t.mock.method(authService, 'me', async () => ({
      data: { id: 'user-2', role: 'admin' },
    }));

    const restored = await useAuthStore.getState().initializeAuth();

    assert.equal(restored, true);
    assert.equal(refresh.mock.callCount(), 1);
    assert.equal(useAuthStore.getState().isAuthenticated, true);
    assert.equal(useAuthStore.getState().accessToken, 'access-renovado');
  });

  it('iOS sin cookie de refresh queda sin sesión y no llama /me', async (t) => {
    resetState();
    t.mock.method(authService, 'refresh', async () => {
      const error = new Error('No se proporcionó refresh token.');
      error.response = { status: 401, data: { code: 'MISSING_REFRESH_TOKEN' } };
      throw error;
    });
    const me = t.mock.method(authService, 'me', async () => ({
      data: { id: 'no-debe-llamarse' },
    }));

    const restored = await useAuthStore.getState().initializeAuth();

    assert.equal(restored, false);
    assert.equal(me.mock.callCount(), 0);
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.equal(useAuthStore.getState().accessToken, null);
    assert.equal(useAuthStore.getState().isInitializing, false);
    assert.equal(useAuthStore.getState().isInitialized, true);
  });

  it('deduplica initializeAuth en el doble montaje de StrictMode', async (t) => {
    resetState();
    const refresh = t.mock.method(authService, 'refresh', async () => ({
      data: { accessToken: 'access-unico' },
    }));
    const me = t.mock.method(authService, 'me', async () => ({
      data: { id: 'user-2', role: 'admin' },
    }));

    await Promise.all([
      useAuthStore.getState().initializeAuth(),
      useAuthStore.getState().initializeAuth(),
    ]);

    assert.equal(refresh.mock.callCount(), 1);
    assert.equal(me.mock.callCount(), 1);
  });

  it('logout limpia estado, caché y no persiste tokens', async (t) => {
    resetState();
    useAuthStore.setState({
      user: { id: 'user-1' },
      isAuthenticated: true,
      accessToken: 'access',
    });
    queryClient.setQueryData(['habitantes'], [{ id: 1 }]);
    const logout = t.mock.method(authService, 'logout', async () => {});

    await useAuthStore.getState().logout();

    assert.equal(logout.mock.callCount(), 1);
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.equal(useAuthStore.getState().accessToken, null);
    assert.equal(queryClient.getQueryCache().getAll().length, 0);
    assert.equal(storage.writes, 0);
  });

  it('muestra aviso genérico cuando /me responde 401', async (t) => {
    resetState();
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'expirado' });
    t.mock.method(authService, 'me', async () => {
      const error = new Error('Token expirado');
      error.response = { status: 401 };
      throw error;
    });

    const valid = await useAuthStore.getState().checkAuth();

    assert.equal(valid, false);
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.match(useAuthStore.getState().sessionNotice, /sesión expiró/i);
  });
});

describe('api — renovación compartida por cookie (R-03)', () => {
  it('una sola renovación atiende peticiones 401 concurrentes y no envía refresh en body', async (t) => {
    resetState();
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'access-anterior',
    });

    let refreshCalls = 0;
    let protectedCalls = 0;
    let refreshBody;

    api.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        refreshCalls += 1;
        refreshBody = config.data;
        return {
          data: { accessToken: 'access-nuevo' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      protectedCalls += 1;
      const authorization =
        config.headers?.Authorization || config.headers?.get?.('Authorization');

      if (authorization !== 'Bearer access-nuevo') {
        const error = new Error('Token expirado');
        error.config = config;
        error.response = { status: 401, data: {}, headers: {}, config };
        throw error;
      }

      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => api.get('/habitantes'))
    );

    assert.equal(responses.length, 10);
    assert.ok(responses.every((response) => response.data.ok === true));
    assert.equal(refreshCalls, 1);
    assert.equal(protectedCalls, 20);
    assert.equal(refreshBody, undefined);
    assert.equal(useAuthStore.getState().accessToken, 'access-nuevo');
  });

  it('si la cookie de refresh falla, limpia sesión, caché y avisa', async (t) => {
    resetState();
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'user-1' },
      accessToken: 'access-expirado',
    });
    queryClient.setQueryData(['perfil'], { id: 'user-1' });

    api.defaults.adapter = async (config) => {
      const error = new Error('No autorizado');
      error.config = config;
      error.response = { status: 401, data: {}, headers: {}, config };
      throw error;
    };

    await assert.rejects(() => api.get('/habitantes'));

    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.equal(useAuthStore.getState().accessToken, null);
    assert.equal(queryClient.getQueryCache().getAll().length, 0);
    assert.match(useAuthStore.getState().sessionNotice, /sesión expiró/i);
  });
});
