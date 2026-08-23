import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthenticationApiService } from './authentication-api.service';
import { AuthSession } from './authentication.model';
import { AuthenticationStore } from './authentication.store';

describe('AuthenticationStore', () => {
  const session: AuthSession = {
    accessToken: 'signed-token',
    expiresAt: '2099-01-01T00:00:00Z',
    username: 'admin',
    role: 'InventoryManager',
  };
  let navigateByUrl: jasmine.Spy;
  let navigate: jasmine.Spy;
  let store: AuthenticationStore;

  beforeEach(() => {
    sessionStorage.clear();
    navigateByUrl = jasmine.createSpy('navigateByUrl').and.resolveTo(true);
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthenticationStore,
        {
          provide: AuthenticationApiService,
          useValue: { login: jasmine.createSpy('login').and.returnValue(of(session)) },
        },
        {
          provide: Router,
          useValue: { url: '/movimientos?pagina=2', navigateByUrl, navigate },
        },
      ],
    });
    store = TestBed.inject(AuthenticationStore);
  });

  afterEach(() => sessionStorage.clear());

  it('persists a valid authenticated session', async () => {
    const result = await store.login({ username: 'admin', password: 'secret' });

    expect(result).toBeTrue();
    expect(store.isAuthenticated()).toBeTrue();
    expect(store.accessToken()).toBe('signed-token');
    expect(sessionStorage.getItem('agaval.auth.session')).toContain('signed-token');
  });

  it('clears the session and navigates to login on explicit logout', async () => {
    await store.login({ username: 'admin', password: 'secret' });

    store.logout();

    expect(store.isAuthenticated()).toBeFalse();
    expect(sessionStorage.getItem('agaval.auth.session')).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledOnceWith('/login');
  });

  it('preserves the current route when the token expires', async () => {
    await store.login({ username: 'admin', password: 'secret' });

    store.expireSession();

    expect(store.isAuthenticated()).toBeFalse();
    expect(navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { returnUrl: '/movimientos?pagina=2' },
    });
  });
});
