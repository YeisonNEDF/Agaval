import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError, ValidationErrors } from '../models/api-error.model';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => throwError(() => normalizeHttpError(error))),
  );

function normalizeHttpError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError('Ocurrió un error inesperado al procesar la solicitud.', 0);
  }

  if (error.status === 0) {
    return new ApiError('No fue posible conectar con el servidor. Verifique que la API esté disponible.', 0);
  }

  const body = isRecord(error.error) ? error.error : {};
  const detail = typeof body['detail'] === 'string' ? body['detail'] : null;
  const title = typeof body['title'] === 'string' ? body['title'] : null;

  return new ApiError(
    detail ?? title ?? `La solicitud falló con estado HTTP ${error.status}.`,
    error.status,
    extractValidationErrors(body['errors']),
  );
}

function extractValidationErrors(value: unknown): ValidationErrors {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([field, messages]) => [
      field,
      Array.isArray(messages)
        ? messages.filter((message): message is string => typeof message === 'string')
        : [],
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
