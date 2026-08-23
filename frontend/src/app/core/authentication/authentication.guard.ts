import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationStore } from './authentication.store';

export const authenticationGuard: CanActivateFn = (_route, state) => {
  const authentication = inject(AuthenticationStore);
  if (authentication.isAuthenticated()) {
    return true;
  }

  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const guestGuard: CanActivateFn = () => {
  const authentication = inject(AuthenticationStore);
  return authentication.isAuthenticated()
    ? inject(Router).createUrlTree(['/productos'])
    : true;
};
