import type { AxiosError } from 'axios';
import type { ApiFailure } from '@karaman/shared-types';

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'RATE_LIMIT'
  | 'SERVER'
  | 'UNKNOWN'
  | string;

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode?: number;
  public readonly userMessage: string;
  public readonly raw: unknown;

  constructor(input: {
    code: ApiErrorCode;
    message: string;
    statusCode?: number;
    userMessage: string;
    raw?: unknown;
  }) {
    super(input.message);
    this.name = 'ApiError';
    this.code = input.code;
    this.statusCode = input.statusCode;
    this.userMessage = input.userMessage;
    this.raw = input.raw;
  }

  static fromAxios(error: AxiosError): ApiError {
    const response = error.response;
    const data = response?.data as ApiFailure | undefined;

    if (!response) {
      const code = error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK';
      const message =
        code === 'TIMEOUT'
          ? 'İstek zaman aşımına uğradı.'
          : 'İnternet bağlantınızı kontrol edin.';
      return new ApiError({
        code,
        message: error.message,
        userMessage: message,
        raw: error,
      });
    }

    const code = data?.error?.code ?? mapStatusToCode(response.status);
    const apiMessage = data?.error?.message ?? error.message;
    return new ApiError({
      code,
      message: apiMessage,
      statusCode: response.status,
      userMessage: mapStatusToUserMessage(response.status, apiMessage),
      raw: error,
    });
  }
}

function mapStatusToCode(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 422) return 'VALIDATION';
  if (status === 429) return 'RATE_LIMIT';
  if (status >= 500) return 'SERVER';
  return 'UNKNOWN';
}

function mapStatusToUserMessage(status: number, fallback: string): string {
  switch (status) {
    case 400:
      return 'Geçersiz istek. Lütfen bilgileri kontrol edin.';
    case 401:
      return 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
    case 403:
      return 'Bu işlem için yetkiniz yok.';
    case 404:
      return 'Aradığınız içerik bulunamadı.';
    case 422:
      return fallback || 'Girdiğiniz bilgiler doğrulanamadı.';
    case 429:
      return 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    default:
      return fallback || 'Beklenmedik bir hata oluştu.';
  }
}
