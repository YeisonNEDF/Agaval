import { provideZonelessChangeDetection, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthenticationStore } from './core/authentication/authentication.store';

describe('App', () => {
  let authenticated: WritableSignal<boolean>;
  let username: WritableSignal<string | null>;
  let logoutSpy: jasmine.Spy;

  beforeEach(async () => {
    authenticated = signal(false);
    username = signal<string | null>(null);
    logoutSpy = jasmine.createSpy('logout');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthenticationStore,
          useValue: {
            isAuthenticated: authenticated,
            username,
            logout: logoutSpy,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the AGAVAL brand', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-shell__brand')?.textContent).toContain('AGAVAL');
  });

  it('hides inventory navigation and links the brand to login without a session', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.app-shell__nav-link').length).toBe(0);
    expect(compiled.querySelector('.app-shell__brand')?.getAttribute('href')).toBe('/login');
    expect(compiled.querySelector('.app-shell__session')?.textContent).toContain('Ingresar');
  });

  it('exposes every inventory route only with an authenticated session', async () => {
    authenticated.set(true);
    username.set('admin');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
        '.app-shell__nav-link',
      ),
    );

    expect(
      links.map((link) =>
        link.querySelector('.app-shell__nav-label')?.textContent?.trim(),
      ),
    ).toEqual(['Inventario', 'Stock bajo', 'Movimientos', 'Categorías']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/productos',
      '/productos/stock-bajo',
      '/movimientos',
      '/categorias',
    ]);
  });

  it('delegates explicit logout to the authentication store', () => {
    const fixture = TestBed.createComponent(App);

    fixture.componentInstance.logout();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });
});
