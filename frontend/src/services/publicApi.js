import axios from 'axios';

/** Cliente público sin Authorization ni credenciales cross-origin/interceptor de refresh. */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: false,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
});

export default publicApi;
