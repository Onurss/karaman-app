import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ApiError } from './errors';

export interface KaramanClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  getToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void | Promise<void>;
}

export type KaramanApiClient = AxiosInstance;

export function createKaramanApiClient(options: KaramanClientOptions): KaramanApiClient {
  const client = axios.create({
    baseURL: options.baseUrl,
    timeout: options.timeoutMs ?? 10_000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': options.apiKey,
    },
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (options.getToken) {
      const token = await options.getToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return config;
  });

  client.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      const apiError = ApiError.fromAxios(error);
      if (apiError.statusCode === 401 && options.onUnauthorized) {
        try {
          await options.onUnauthorized();
        } catch {
          /* yutkun */
        }
      }
      throw apiError;
    },
  );

  return client;
}
