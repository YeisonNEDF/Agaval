import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authenticationGuard, guestGuard } from './authentication.guard';
import { AuthenticationStore } from './authentication.store';

describe('authentication guards', () => {
  const authenticated = signal(false);
  const route = {} as ActivatedRouteSnapshot;

  beforeEach(() => {
    authenticated.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthenticationStore,
          useValue: { isAuthenticated: authenticated },
        },
      ],
    });
  });

  it('preserves the requested URL when a guest opens a protected route', () => {
    const state = { url: '/movimientos?pagina=2' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => authenticationGuard(route, state));
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/login?returnUrl=%2Fmovimientos%3Fpagina%3D2',
    );
  });

  it('allows an authenticated user to activate protected routes', () => {
    authenticated.set(true);
    const state = { url: '/productos' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => authenticationGuard(route, state));

    expect(result).toBeTrue();
  });

  it('allows guests to activate the login route', () => {
    const state = { url: '/login' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));

    expect(result).toBeTrue();
  });

  it('redirects an authenticated user away from login', () => {
    authenticated.set(true);
    const state = { url: '/login' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as UrlTree)).toBe('/productos');
  });
});
