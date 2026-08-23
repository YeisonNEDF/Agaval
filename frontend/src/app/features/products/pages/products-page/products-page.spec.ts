import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthenticationStore } from '../../../../core/authentication/authentication.store';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ProductsStore } from '../../services/products.store';
import { ProductsPageComponent } from './products-page';

describe('ProductsPageComponent', () => {
  let fixture: ComponentFixture<ProductsPageComponent>;
  let loadSpy: jasmine.Spy;
  let dialogOpenSpy: jasmine.Spy;
  let router: Router;

  beforeEach(async () => {
    loadSpy = jasmine.createSpy('load').and.resolveTo();
    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(undefined) });
    const storeStub = {
      products: signal([]),
      categories: signal([]),
      query: signal({
        categoryId: null,
        stock: 'all',
        search: '',
        pageNumber: 1,
        pageSize: 10,
        sortBy: 'Name',
        sortDirection: 'Ascending',
      }),
      filters: signal({ categoryId: null, stock: 'all', search: '' }),
      loading: signal(false),
      saving: signal(false),
      error: signal(null),
      totalCount: signal(0),
      totalProducts: signal(0),
      lowStockCount: signal(0),
      inventoryValue: signal(0),
      hasActiveFilters: signal(false),
      load: loadSpy,
      setQuery: jasmine.createSpy('setQuery'),
      create: jasmine.createSpy('create').and.resolveTo(true),
      update: jasmine.createSpy('update').and.resolveTo(true),
      adjustStock: jasmine.createSpy('adjustStock').and.resolveTo(true),
      delete: jasmine.createSpy('delete').and.resolveTo(true),
    };

    await TestBed.configureTestingModule({
      imports: [ProductsPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ProductsStore, useValue: storeStub },
        {
          provide: AuthenticationStore,
          useValue: {
            isAuthenticated: signal(true),
            username: signal('test-manager'),
            logout: jasmine.createSpy('logout'),
          },
        },
        { provide: MatDialog, useValue: { open: dialogOpenSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsPageComponent);
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('loads inventory data on creation', () => {
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('renders the page title', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Inventario de productos');
  });

  it('uses a dedicated route for the low-stock view', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.setFilters({ categoryId: null, stock: 'low', search: '' });

    expect(navigateSpy).toHaveBeenCalledOnceWith(['/productos/stock-bajo'], {
      queryParams: {},
    });
  });

  it('keeps category and normal-stock filters shareable in the URL', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.setFilters({ categoryId: 2, stock: 'normal', search: '' });

    expect(navigateSpy).toHaveBeenCalledOnceWith(['/productos'], {
      queryParams: { categoriaId: 2, stock: 'normal' },
    });
  });

  it('keeps the product form inside the viewport', async () => {
    await fixture.componentInstance.openCreateDialog();

    expect(dialogOpenSpy).toHaveBeenCalledWith(
      jasmine.any(Function),
      jasmine.objectContaining({
        width: '44rem',
        maxWidth: 'calc(100vw - 2rem)',
        maxHeight: 'calc(100dvh - 2rem)',
        panelClass: 'product-form-dialog',
      }),
    );
  });
});
