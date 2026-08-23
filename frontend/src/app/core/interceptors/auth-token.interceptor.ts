import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthenticationStore } from '../authentication/authentication.store';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const authentication = inject(AuthenticationStore);
  const accessToken = authentication.accessToken();
  const authenticatedRequest =
    accessToken === null || !request.url.startsWith('/api')
      ? request
      : request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && accessToken !== null) {
        authentication.logout();
      }

      return throwError(() => error);
    }),
  );
};
