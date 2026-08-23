import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthenticationStore } from './core/authentication/authentication.store';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthenticationStore,
          useValue: {
            isAuthenticated: signal(false),
            username: signal(null),
            logout: jasmine.createSpy('logout'),
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

  it('exposes public inventory navigation', async () => {
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
    ).toEqual(['Inventario', 'Stock bajo', 'Movimientos']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/productos',
      '/productos/stock-bajo',
      '/movimientos',
    ]);
  });
});
