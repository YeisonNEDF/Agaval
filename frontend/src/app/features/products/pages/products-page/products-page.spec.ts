import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { ProductsStore } from '../../services/products.store';
import { ProductsPageComponent } from './products-page';

describe('ProductsPageComponent', () => {
  let fixture: ComponentFixture<ProductsPageComponent>;
  let loadSpy: jasmine.Spy;
  let router: Router;

  beforeEach(async () => {
    loadSpy = jasmine.createSpy('load').and.resolveTo();
    const storeStub = {
      products: signal([]),
      categories: signal([]),
      filters: signal({ categoryId: null, stock: 'all' }),
      loading: signal(false),
      saving: signal(false),
      error: signal(null),
      filteredProducts: signal([]),
      totalProducts: signal(0),
      lowStockCount: signal(0),
      inventoryValue: signal(0),
      hasActiveFilters: signal(false),
      load: loadSpy,
      setFilters: jasmine.createSpy('setFilters'),
      clearFilters: jasmine.createSpy('clearFilters'),
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
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
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

    fixture.componentInstance.setFilters({ categoryId: null, stock: 'low' });

    expect(navigateSpy).toHaveBeenCalledOnceWith(['/productos/stock-bajo'], {
      queryParams: {},
    });
  });

  it('keeps category and normal-stock filters shareable in the URL', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.setFilters({ categoryId: 2, stock: 'normal' });

    expect(navigateSpy).toHaveBeenCalledOnceWith(['/productos'], {
      queryParams: { categoriaId: 2, stock: 'normal' },
    });
  });
});
