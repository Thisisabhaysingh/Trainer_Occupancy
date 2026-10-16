import axios from 'axios';
import { normalizeApiError } from './apiError';

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiBaseUrl = configuredBaseUrl.endsWith('/api') ? configuredBaseUrl : `${configuredBaseUrl}/api`;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30000,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedError = normalizeApiError(error);
    if (normalizedError.status === 401 && !error.config?.skipAuthRedirect) {
      window.dispatchEvent(new CustomEvent('app:authentication-expired'));
    }
    if (import.meta.env.DEV && normalizedError.code !== 'REQUEST_CANCELLED') {
      console.warn('[apiClient]', normalizedError.code, normalizedError.message);
    }
    return Promise.reject(normalizedError);
  },
);

export const createRequestController = () => new AbortController();

export default apiClient;
