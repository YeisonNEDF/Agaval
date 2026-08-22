import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
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

  it('exposes inventory and low-stock navigation', async () => {
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
    ).toEqual(['Inventario', 'Stock bajo']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/productos',
      '/productos/stock-bajo',
    ]);
  });
});
