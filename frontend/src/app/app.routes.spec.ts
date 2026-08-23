import { authenticationGuard, guestGuard } from './core/authentication/authentication.guard';
import { routes } from './app.routes';

describe('application routes', () => {
  it('protects every inventory feature at its lazy boundary', () => {
    const protectedPaths = ['productos', 'categorias', 'movimientos'];

    for (const path of protectedPaths) {
      const route = routes.find((candidate) => candidate.path === path);
      expect(route?.canActivate).toContain(authenticationGuard);
      expect(typeof route?.loadChildren).toBe('function');
    }
  });

  it('keeps login public only for guests', () => {
    const loginRoute = routes.find((route) => route.path === 'login');

    expect(loginRoute?.canActivate).toContain(guestGuard);
    expect(typeof loginRoute?.loadComponent).toBe('function');
  });
});
