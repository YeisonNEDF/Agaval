import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Product } from '../../models/product.model';
import { ProductListComponent } from './product-list';

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  const product: Product = {
    id: 1,
    name: 'Teclado',
    description: 'Mecánico',
    price: 249900,
    stock: 4,
    minimumStock: 5,
    isLowStock: true,
    categoryId: 1,
    categoryName: 'Electrónica',
    createdAt: '2026-08-22T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductListComponent);
    fixture.componentRef.setInput('products', [product]);
    await fixture.whenStable();
  });

  it('renders a low-stock product', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Teclado');
    expect(element.textContent).toContain('Stock bajo');
  });

  it('emits the selected product for edition', () => {
    const emitted: Product[] = [];
    fixture.componentInstance.editRequested.subscribe((value) => emitted.push(value));

    fixture.componentInstance.editRequested.emit(product);

    expect(emitted).toEqual([product]);
  });
});
