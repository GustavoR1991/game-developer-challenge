import { isAxiosError, isCancel } from 'axios';
import { ZodError } from 'zod';
import { apiErrorBodySchema } from '../contracts/matches';

export type ApiErrorKind = 'timeout' | 'network' | 'http' | 'invalid-response' | 'cancelled';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }

  get retryable(): boolean {
    if (this.kind === 'timeout' || this.kind === 'network') return true;
    if (this.kind === 'http' && this.status !== null) return this.status >= 500 || this.status === 429;
    return false;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) {
    return new ApiError('invalid-response', 'The server sent an unexpected response.');
  }
  if (isCancel(error)) return new ApiError('cancelled', 'The request was cancelled.');
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('timeout', 'The server took too long to answer.');
    }
    if (!error.response) return new ApiError('network', 'Could not reach the server.');
    const parsed = apiErrorBodySchema.safeParse(error.response.data);
    const message = parsed.success
      ? parsed.data.error.message
      : `The server answered with status ${error.response.status}.`;
    return new ApiError(
      'http',
      message,
      error.response.status,
      parsed.success ? parsed.data.error.code : null,
    );
  }
  return new ApiError('network', error instanceof Error ? error.message : 'Unexpected network error.');
}

export function isRetryableError(error: unknown): boolean {
  return toApiError(error).retryable;
}

export function describeApiError(error: unknown): string {
  const apiError = toApiError(error);
  switch (apiError.kind) {
    case 'timeout':
      return 'The server took too long to answer.';
    case 'network':
      return 'Could not reach the server. Check your connection.';
    case 'invalid-response':
      return 'The server sent an unexpected response.';
    case 'cancelled':
      return 'The request was cancelled.';
    default:
      return apiError.message;
  }
}
